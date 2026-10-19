-- ==============================================================================
-- Migration : [F06] Livraison Groupée Multi-Marchands (DaloaMarket & DaloaDelivery V2)
-- Tournées combinées d'un même livreur pour plusieurs boutiques vers un même acheteur.
-- Tarification dégressive (+300 FCFA par stop supplémentaire) & économie client.
-- ==============================================================================

-- 1. Évolution de la table `orders`
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_group_id uuid,
  ADD COLUMN IF NOT EXISTS is_grouped boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grouped_stop_index integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS grouped_delivery_discount numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_group_id
  ON public.orders (delivery_group_id)
  WHERE delivery_group_id IS NOT NULL;

-- 2. Évolution de la table `delivery_assignments`
ALTER TABLE public.delivery_assignments
  ADD COLUMN IF NOT EXISTS delivery_group_id uuid,
  ADD COLUMN IF NOT EXISTS is_grouped boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_total_stops integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS group_completed_stops integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grouped_stops jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_delivery_assignments_group_id
  ON public.delivery_assignments (delivery_group_id)
  WHERE delivery_group_id IS NOT NULL;

-- 3. Table de suivi des tournées groupées `delivery_group_runs`
CREATE TABLE IF NOT EXISTS public.delivery_group_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.users(id),
  total_sellers integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'awaiting_pickup'
    CHECK (status IN ('awaiting_pickup', 'accepted', 'in_pickup', 'in_transit', 'delivered', 'cancelled')),
  delivery_person_id uuid REFERENCES public.delivery_persons(id),
  total_delivery_price numeric NOT NULL DEFAULT 0,
  driver_earning numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  buyer_discount numeric NOT NULL DEFAULT 0,
  dropoff_address text NOT NULL,
  dropoff_district text,
  dropoff_lat double precision,
  dropoff_lng double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_group_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_group_runs_buyer_select"
  ON public.delivery_group_runs FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "delivery_group_runs_driver_select"
  ON public.delivery_group_runs FOR SELECT
  USING (
    delivery_person_id IS NULL
    OR auth.uid() IN (SELECT user_id FROM public.delivery_persons WHERE id = delivery_person_id)
  );

CREATE POLICY "delivery_group_runs_driver_update"
  ON public.delivery_group_runs FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM public.delivery_persons WHERE id = delivery_person_id)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.delivery_persons WHERE id = delivery_person_id)
  );

-- 4. Fonction de calcul du devis de livraison groupée
-- Règle tarifaire :
-- Stop principal = max des frais de livraison individuels
-- Chaque stop additionnel = +300 FCFA
-- Économie acheteur = somme des frais individuels - tarif groupé
CREATE OR REPLACE FUNCTION public.fn_calculate_grouped_delivery_quote(
  p_seller_fees numeric[],
  p_additional_stop_rate numeric DEFAULT 300
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_count integer;
  v_max_fee numeric := 0;
  v_sum_fees numeric := 0;
  v_additional_stops integer;
  v_additional_fee numeric := 0;
  v_grouped_total numeric := 0;
  v_savings numeric := 0;
  v_fee numeric;
BEGIN
  IF p_seller_fees IS NULL OR array_length(p_seller_fees, 1) = 0 THEN
    RETURN jsonb_build_object(
      'total_grouped_fee', 0,
      'base_fee', 0,
      'additional_fee', 0,
      'sum_individual_fees', 0,
      'savings', 0,
      'stop_count', 0
    );
  END IF;

  v_count := array_length(p_seller_fees, 1);

  FOREACH v_fee IN ARRAY p_seller_fees LOOP
    v_sum_fees := v_sum_fees + v_fee;
    IF v_fee > v_max_fee THEN
      v_max_fee := v_fee;
    END IF;
  END LOOP;

  IF v_count = 1 THEN
    RETURN jsonb_build_object(
      'total_grouped_fee', v_max_fee,
      'base_fee', v_max_fee,
      'additional_fee', 0,
      'sum_individual_fees', v_sum_fees,
      'savings', 0,
      'stop_count', 1
    );
  END IF;

  v_additional_stops := v_count - 1;
  v_additional_fee := v_additional_stops * p_additional_stop_rate;
  v_grouped_total := v_max_fee + v_additional_fee;
  v_savings := GREATEST(0, v_sum_fees - v_grouped_total);

  RETURN jsonb_build_object(
    'total_grouped_fee', v_grouped_total,
    'base_fee', v_max_fee,
    'additional_fee', v_additional_fee,
    'sum_individual_fees', v_sum_fees,
    'savings', v_savings,
    'stop_count', v_count
  );
END;
$$;

-- 5. RPC de confirmation d'un stop de collecte par le livreur
CREATE OR REPLACE FUNCTION public.confirm_grouped_pickup_stop(
  p_assignment_id uuid,
  p_stop_index integer,
  p_seller_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_driver_id uuid;
  v_assign record;
  v_stops jsonb;
  v_updated_stops jsonb := '[]'::jsonb;
  v_stop jsonb;
  v_new_completed integer := 0;
  v_all_completed boolean := false;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  SELECT id INTO v_driver_id
  FROM public.delivery_persons
  WHERE user_id = v_caller_id;

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Profil livreur introuvable';
  END IF;

  SELECT * INTO v_assign
  FROM public.delivery_assignments
  WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignation introuvable';
  END IF;

  IF v_assign.delivery_person_id IS DISTINCT FROM v_driver_id THEN
    RAISE EXCEPTION 'Cette course ne vous est pas assignée';
  END IF;

  v_stops := COALESCE(v_assign.grouped_stops, '[]'::jsonb);

  -- Mise à jour du stop ciblé
  FOR v_stop IN SELECT * FROM jsonb_array_elements(v_stops) LOOP
    IF (v_stop->>'stop_index')::integer = p_stop_index THEN
      v_updated_stops := v_updated_stops || jsonb_build_object(
        'stop_index', p_stop_index,
        'seller_id', p_seller_id,
        'shop_name', v_stop->>'shop_name',
        'address', v_stop->>'address',
        'district', v_stop->>'district',
        'latitude', (v_stop->>'latitude')::numeric,
        'longitude', (v_stop->>'longitude')::numeric,
        'status', 'picked_up',
        'picked_up_at', now(),
        'notes', p_notes
      );
      v_new_completed := v_new_completed + 1;
    ELSE
      v_updated_stops := v_updated_stops || v_stop;
      IF (v_stop->>'status') = 'picked_up' THEN
        v_new_completed := v_new_completed + 1;
      END IF;
    END IF;
  END LOOP;

  v_all_completed := (v_new_completed >= v_assign.group_total_stops);

  -- Mise à jour de l'assignation
  UPDATE public.delivery_assignments
  SET
    group_completed_stops = v_new_completed,
    grouped_stops = v_updated_stops,
    status = CASE WHEN v_all_completed THEN 'in_transit' ELSE 'picked_up' END,
    updated_at = now()
  WHERE id = p_assignment_id;

  -- Si rattaché à une commande liée à ce vendeur, mise à jour
  UPDATE public.orders
  SET
    status = 'shipped',
    updated_at = now()
  WHERE delivery_group_id = v_assign.delivery_group_id
    AND seller_id = p_seller_id
    AND status IN ('pending', 'confirmed');

  RETURN jsonb_build_object(
    'success', true,
    'stop_index', p_stop_index,
    'completed_stops', v_new_completed,
    'total_stops', v_assign.group_total_stops,
    'all_completed', v_all_completed,
    'new_status', CASE WHEN v_all_completed THEN 'in_transit' ELSE 'picked_up' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_calculate_grouped_delivery_quote(numeric[], numeric) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.confirm_grouped_pickup_stop(uuid, integer, uuid, text) TO authenticated;
