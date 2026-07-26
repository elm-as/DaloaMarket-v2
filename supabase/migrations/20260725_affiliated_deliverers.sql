-- ============================================================================
-- MIGRATION: Livreurs Affiliés (Livreurs Personnels Vendeurs Pro)
-- Date: 2026-07-25
-- ============================================================================

-- 1. Table seller_delivery_settings (Paramètres de livraison par vendeur)
CREATE TABLE IF NOT EXISTS public.seller_delivery_settings (
  seller_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  home_delivery_enabled boolean NOT NULL DEFAULT true,
  cash_on_delivery_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.seller_delivery_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can view seller delivery settings"
    ON public.seller_delivery_settings FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Sellers can manage their own delivery settings"
    ON public.seller_delivery_settings FOR ALL
    USING (auth.uid() = seller_id)
    WITH CHECK (auth.uid() = seller_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Table seller_delivery_affiliations (Affiliations Vendeur Pro <-> Livreur)
CREATE TABLE IF NOT EXISTS public.seller_delivery_affiliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delivery_person_id uuid NOT NULL REFERENCES public.delivery_persons(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_seller_driver UNIQUE (seller_id, delivery_person_id)
);

ALTER TABLE public.seller_delivery_affiliations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Sellers can view their affiliations"
    ON public.seller_delivery_affiliations FOR SELECT
    TO authenticated
    USING (auth.uid() = seller_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Drivers can view affiliations targeting them"
    ON public.seller_delivery_affiliations FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.delivery_persons dp
        WHERE dp.id = seller_delivery_affiliations.delivery_person_id
        AND dp.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Sellers can insert affiliations"
    ON public.seller_delivery_affiliations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = seller_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Sellers can delete affiliations"
    ON public.seller_delivery_affiliations FOR DELETE
    TO authenticated
    USING (auth.uid() = seller_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Drivers can update status of their affiliations"
    ON public.seller_delivery_affiliations FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.delivery_persons dp
        WHERE dp.id = seller_delivery_affiliations.delivery_person_id
        AND dp.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- 3. Extension des tables delivery_assignments et orders
ALTER TABLE public.delivery_assignments
  ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'online';


-- 4. RLS Update pour delivery_assignments (Prise en compte des commandes privées)
-- Les livreurs peuvent voir les assignments si :
-- - la commande est publique (is_private = false OU is_private IS NULL)
-- - OU la commande est privée (is_private = true) ET le livreur possède une affiliation 'active' avec le seller_id de l'assignment
DROP POLICY IF EXISTS "delivery_assignments_select_public_or_affiliated" ON public.delivery_assignments;
CREATE POLICY "delivery_assignments_select_public_or_affiliated"
ON public.delivery_assignments FOR SELECT
TO authenticated
USING (
  -- Assignments assignés au livreur lui-même
  EXISTS (
    SELECT 1 FROM public.delivery_persons dp
    WHERE dp.id = delivery_assignments.delivery_person_id
    AND dp.user_id = auth.uid()
  )
  OR
  -- Assignments en attente de prise en charge (awaiting_pickup)
  (
    delivery_assignments.status = 'awaiting_pickup'
    AND (
      delivery_assignments.is_private IS NOT TRUE
      OR EXISTS (
        SELECT 1 FROM public.delivery_persons dp
        JOIN public.seller_delivery_affiliations sda ON sda.delivery_person_id = dp.id
        WHERE dp.user_id = auth.uid()
        AND sda.seller_id = delivery_assignments.seller_id
        AND sda.status = 'active'
      )
    )
  )
);


-- 5. RPC : Envoyer une invitation d'affiliation à un livreur par son numéro de téléphone
CREATE OR REPLACE FUNCTION public.invite_delivery_driver_by_phone(p_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seller_id uuid := auth.uid();
  v_is_pro boolean;
  v_driver record;
  v_existing record;
  v_clean_phone text;
BEGIN
  -- Vérifier l'authentification
  IF v_seller_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Non authentifié');
  END IF;

  -- Nettoyer le numéro de téléphone (garder seulement les chiffres)
  v_clean_phone := regexp_replace(p_phone, '\D', '', 'g');
  IF length(v_clean_phone) > 10 THEN
    v_clean_phone := right(v_clean_phone, 10);
  END IF;

  -- Vérifier que le vendeur est Pro
  SELECT COALESCE(pro_until > now(), false) INTO v_is_pro
  FROM public.users WHERE id = v_seller_id;

  IF NOT v_is_pro THEN
    RETURN json_build_object('success', false, 'message', 'Seuls les vendeurs Pro peuvent avoir des livreurs affiliés');
  END IF;

  -- Trouver le livreur par son numéro de téléphone dans delivery_persons
  SELECT dp.id, dp.name, dp.phone, dp.user_id INTO v_driver
  FROM public.delivery_persons dp
  WHERE regexp_replace(dp.phone, '\D', '', 'g') LIKE '%' || v_clean_phone
  LIMIT 1;

  IF v_driver.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Aucun livreur trouvé avec ce numéro de téléphone sur DaloaDelivery');
  END IF;

  -- Vérifier si une affiliation existe déjà
  SELECT id, status INTO v_existing
  FROM public.seller_delivery_affiliations
  WHERE seller_id = v_seller_id AND delivery_person_id = v_driver.id;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.status = 'active' THEN
      RETURN json_build_object('success', false, 'message', 'Ce livreur est déjà affilié à votre boutique');
    ELSIF v_existing.status = 'pending' THEN
      RETURN json_build_object('success', false, 'message', 'Une invitation est déjà en attente pour ce livreur');
    ELSE
      -- Si précédemment rejeté, relancer une invitation pending
      UPDATE public.seller_delivery_affiliations
      SET status = 'pending', updated_at = now()
      WHERE id = v_existing.id;

      RETURN json_build_object('success', true, 'message', 'Invitation d''affiliation renvoyée avec succès à ' || v_driver.name);
    END IF;
  END IF;

  -- Créer la demande d'affiliation
  INSERT INTO public.seller_delivery_affiliations (seller_id, delivery_person_id, status)
  VALUES (v_seller_id, v_driver.id, 'pending');

  RETURN json_build_object('success', true, 'message', 'Invitation envoyée avec succès à ' || v_driver.name);
END;
$$;


-- 6. RPC : Mettre à jour les paramètres de livraison du vendeur
CREATE OR REPLACE FUNCTION public.update_seller_delivery_settings(
  p_home_delivery boolean,
  p_cash_on_delivery boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seller_id uuid := auth.uid();
  v_is_pro boolean;
BEGIN
  IF v_seller_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Non authentifié');
  END IF;

  SELECT COALESCE(pro_until > now(), false) INTO v_is_pro
  FROM public.users WHERE id = v_seller_id;

  IF NOT v_is_pro THEN
    RETURN json_build_object('success', false, 'message', 'Fonctionnalité réservée aux vendeurs Pro');
  END IF;

  INSERT INTO public.seller_delivery_settings (seller_id, home_delivery_enabled, cash_on_delivery_enabled, updated_at)
  VALUES (v_seller_id, p_home_delivery, p_cash_on_delivery, now())
  ON CONFLICT (seller_id) DO UPDATE
  SET home_delivery_enabled = EXCLUDED.home_delivery_enabled,
      cash_on_delivery_enabled = EXCLUDED.cash_on_delivery_enabled,
      updated_at = now();

  RETURN json_build_object('success', true, 'message', 'Paramètres de livraison enregistrés');
END;
$$;


-- 7. RPC confirm_seller_availability mise à jour pour marquer is_private et seller_id
CREATE OR REPLACE FUNCTION public.confirm_seller_availability(
  p_order_id uuid
)
RETURNS json AS $$
DECLARE
  assignment_record RECORD;
  order_record RECORD;
  v_is_private boolean := false;
BEGIN
  -- 1. Récupérer la commande et vérifier les droits du vendeur
  SELECT * INTO order_record
  FROM public.orders
  WHERE id = p_order_id AND seller_id = auth.uid();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'order_not_found_or_unauthorized');
  END IF;

  -- Determiner si la commande est privée (Cash on Delivery)
  IF order_record.payment_method = 'cod' THEN
    v_is_private := true;
  END IF;

  -- 2. Récupérer l'assignment s'il existe
  SELECT da.* INTO assignment_record
  FROM public.delivery_assignments da
  WHERE da.order_id = p_order_id
  LIMIT 1;

  IF NOT FOUND THEN
    -- Création de l'assignment si inexistant
    INSERT INTO public.delivery_assignments (
      order_id,
      seller_id,
      is_private,
      status,
      pickup_confirmed_by_seller,
      pickup_confirmed_at,
      pickup_otp,
      delivery_otp
    )
    VALUES (
      p_order_id,
      order_record.seller_id,
      v_is_private,
      'awaiting_pickup',
      true,
      now(),
      lpad(floor(random() * 1000000)::text, 6, '0'),
      lpad(floor(random() * 1000000)::text, 6, '0')
    )
    RETURNING * INTO assignment_record;

    RETURN json_build_object('success', true);
  END IF;

  -- Permettre la confirmation si en attente
  IF assignment_record.status NOT IN ('pending_seller_confirmation', 'pending') THEN
    RETURN json_build_object(
      'success', false, 
      'reason', 'invalid_status', 
      'current_status', assignment_record.status
    );
  END IF;

  -- Mettre à jour l'assignment
  UPDATE public.delivery_assignments
  SET 
    seller_id = order_record.seller_id,
    is_private = v_is_private,
    status = 'awaiting_pickup',
    pickup_confirmed_by_seller = true,
    pickup_confirmed_at = now()
  WHERE id = assignment_record.id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

