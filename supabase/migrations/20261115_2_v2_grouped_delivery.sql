-- ============================================================================
-- Migration : 20261115_2_v2_grouped_delivery.sql (Lot 2/4 V2)
-- Livraison Groupée Multi-Marchands (F06), 100% idempotente et SANS DaloaCash.
-- ============================================================================

-- 1. Colonnes tournées groupées sur orders et delivery_assignments
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_group_id uuid,
  ADD COLUMN IF NOT EXISTS is_grouped boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grouped_stop_index integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS grouped_delivery_discount numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_group_id
  ON public.orders (delivery_group_id)
  WHERE delivery_group_id IS NOT NULL;

ALTER TABLE public.delivery_assignments
  ADD COLUMN IF NOT EXISTS delivery_group_id uuid,
  ADD COLUMN IF NOT EXISTS is_grouped boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_total_stops integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS group_completed_stops integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grouped_stops jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_delivery_assignments_group_id
  ON public.delivery_assignments(delivery_group_id)
  WHERE delivery_group_id IS NOT NULL;

-- 2. Table delivery_group_runs & politiques RLS idempotentes
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

DROP POLICY IF EXISTS "delivery_group_runs_buyer_select" ON public.delivery_group_runs;
CREATE POLICY "delivery_group_runs_buyer_select"
  ON public.delivery_group_runs FOR SELECT USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "delivery_group_runs_driver_select" ON public.delivery_group_runs;
CREATE POLICY "delivery_group_runs_driver_select"
  ON public.delivery_group_runs FOR SELECT
  USING (
    delivery_person_id IS NULL
    OR auth.uid() IN (SELECT user_id FROM public.delivery_persons WHERE id = delivery_person_id)
  );

DROP POLICY IF EXISTS "delivery_group_runs_driver_update" ON public.delivery_group_runs;
CREATE POLICY "delivery_group_runs_driver_update"
  ON public.delivery_group_runs FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM public.delivery_persons WHERE id = delivery_person_id))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.delivery_persons WHERE id = delivery_person_id));

-- 3. Devis & initialisation atomique des tournées groupées (sans daloa_cash_discount)
CREATE OR REPLACE FUNCTION public.fn_calculate_grouped_delivery_quote(
  p_seller_fees numeric[],
  p_additional_stop_rate numeric DEFAULT 300
)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_count integer; v_max_fee numeric := 0; v_sum_fees numeric := 0;
  v_additional_fee numeric := 0; v_grouped_total numeric := 0; v_fee numeric;
BEGIN
  IF p_seller_fees IS NULL OR array_length(p_seller_fees, 1) IS NULL THEN
    RETURN jsonb_build_object('total_grouped_fee', 0, 'base_fee', 0, 'additional_fee', 0, 'sum_individual_fees', 0, 'savings', 0, 'stop_count', 0);
  END IF;
  v_count := array_length(p_seller_fees, 1);
  FOREACH v_fee IN ARRAY p_seller_fees LOOP
    v_sum_fees := v_sum_fees + v_fee;
    IF v_fee > v_max_fee THEN v_max_fee := v_fee; END IF;
  END LOOP;
  IF v_count = 1 THEN
    RETURN jsonb_build_object('total_grouped_fee', v_max_fee, 'base_fee', v_max_fee, 'additional_fee', 0, 'sum_individual_fees', v_sum_fees, 'savings', 0, 'stop_count', 1);
  END IF;
  v_additional_fee := (v_count - 1) * p_additional_stop_rate;
  v_grouped_total := v_max_fee + v_additional_fee;
  RETURN jsonb_build_object(
    'total_grouped_fee', v_grouped_total, 'base_fee', v_max_fee,
    'additional_fee', v_additional_fee, 'sum_individual_fees', v_sum_fees,
    'savings', GREATEST(0, v_sum_fees - v_grouped_total), 'stop_count', v_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_calculate_grouped_delivery_quote(numeric[], numeric) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.setup_grouped_delivery_run(
  p_order_ids        uuid[],
  p_dropoff_address  text,
  p_dropoff_district text DEFAULT NULL,
  p_dropoff_lat      double precision DEFAULT NULL,
  p_dropoff_lng      double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_caller_id uuid := auth.uid(); v_buyer_id uuid; v_group_id uuid; v_existing_group uuid;
  v_rec record; v_idx integer := 0; v_fees numeric[] := '{}';
  v_quote jsonb; v_grouped_total numeric; v_savings numeric;
  v_stops jsonb := '[]'::jsonb; v_primary_order uuid := NULL;
  v_new_fee integer; v_discount integer;
BEGIN
  IF p_order_ids IS NULL OR cardinality(p_order_ids) <= 1 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_enough_orders');
  END IF;

  SELECT buyer_id, delivery_group_id INTO v_buyer_id, v_existing_group
    FROM public.orders WHERE id = p_order_ids[1];
  IF v_buyer_id IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'orders_not_found'); END IF;
  IF v_caller_id IS NOT NULL AND v_caller_id <> v_buyer_id AND NOT is_admin_or_service_role() THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unauthorized');
  END IF;
  IF v_existing_group IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'group_id', v_existing_group, 'already_grouped', true);
  END IF;

  v_group_id := gen_random_uuid();
  PERFORM set_config('app.OrderUpdateAuthorized', 'true', true);

  FOR v_rec IN
    SELECT o.id AS order_id, o.seller_id, COALESCE(o.delivery_fee, 500)::numeric AS delivery_fee,
           u.shop_name, u.full_name, u.district, u.shop_latitude, u.shop_longitude, u.phone
      FROM public.orders o LEFT JOIN public.users u ON u.id = o.seller_id
     WHERE o.id = ANY(p_order_ids) AND o.buyer_id = v_buyer_id
     ORDER BY COALESCE(o.delivery_fee, 500) DESC, o.created_at ASC
  LOOP
    v_idx := v_idx + 1;
    v_fees := v_fees || v_rec.delivery_fee;
    IF v_idx = 1 THEN
      v_primary_order := v_rec.order_id;
      v_new_fee := v_rec.delivery_fee::integer;
      v_discount := 0;
    ELSE
      v_new_fee := LEAST(v_rec.delivery_fee::integer, 300);
      v_discount := GREATEST(0, v_rec.delivery_fee::integer - v_new_fee);
    END IF;

    v_stops := v_stops || jsonb_build_object(
      'stop_index', v_idx, 'seller_id', v_rec.seller_id,
      'shop_name', COALESCE(v_rec.shop_name, v_rec.full_name, 'Boutique'),
      'address', COALESCE(v_rec.district, 'Daloa'), 'district', v_rec.district,
      'latitude', v_rec.shop_latitude, 'longitude', v_rec.shop_longitude,
      'phone', v_rec.phone, 'status', 'pending'
    );

    UPDATE public.orders
       SET delivery_group_id = v_group_id, is_grouped = true, grouped_stop_index = v_idx,
           delivery_fee = v_new_fee, grouped_delivery_discount = v_discount,
           total_amount = GREATEST(0, product_amount + v_new_fee + COALESCE(reserve_fee, 0)),
           updated_at = now()
     WHERE id = v_rec.order_id;
  END LOOP;

  IF v_idx <= 1 THEN RETURN jsonb_build_object('success', false, 'reason', 'not_enough_valid_orders'); END IF;

  v_quote := public.fn_calculate_grouped_delivery_quote(v_fees, 300);
  v_grouped_total := COALESCE((v_quote->>'total_grouped_fee')::numeric, 500);
  v_savings := COALESCE((v_quote->>'savings')::numeric, 0);

  UPDATE public.delivery_assignments
     SET delivery_group_id = v_group_id, is_grouped = true, group_total_stops = v_idx,
         group_completed_stops = 0, grouped_stops = v_stops,
         delivery_price = CASE WHEN order_id = v_primary_order THEN v_grouped_total ELSE 300 END,
         updated_at = now()
   WHERE order_id = ANY(p_order_ids);

  INSERT INTO public.delivery_group_runs (
    id, buyer_id, total_sellers, status, total_delivery_price, driver_earning, platform_fee,
    buyer_discount, dropoff_address, dropoff_district, dropoff_lat, dropoff_lng
  ) VALUES (
    v_group_id, v_buyer_id, v_idx, 'awaiting_pickup', v_grouped_total,
    ROUND(v_grouped_total * 0.90), ROUND(v_grouped_total * 0.10), v_savings,
    COALESCE(NULLIF(TRIM(p_dropoff_address), ''), 'Daloa'), p_dropoff_district, p_dropoff_lat, p_dropoff_lng
  );

  RETURN jsonb_build_object('success', true, 'group_id', v_group_id, 'total_stops', v_idx, 'total_grouped_fee', v_grouped_total, 'savings', v_savings);
END;
$$;

GRANT EXECUTE ON FUNCTION public.setup_grouped_delivery_run(uuid[], text, text, double precision, double precision) TO authenticated;
