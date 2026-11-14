-- ============================================================================
-- Migration: F03 — DaloaDelivery Express Hors-Market
-- Date: 2026-10-21
-- Objectif:
-- 1. Rendre `orders.listing_id` nullable pour les courses express directes.
-- 2. Ajouter les attributs express sur `orders` et `delivery_assignments`.
-- 3. Sécuriser les triggers (stock, colonnes protégées).
-- 4. Créer la RPC `create_express_delivery_run` avec tarification officielle,
--    double OTP (ramassage & dépôt) et attribution dans le pool DaloaDelivery.
-- ============================================================================

-- 1. Rendre `orders.listing_id` optionnel (coursier sans article marketplace)
ALTER TABLE public.orders ALTER COLUMN listing_id DROP NOT NULL;

-- 2. Colonnes express sur `orders`
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'marketplace',
  ADD COLUMN IF NOT EXISTS package_description text,
  ADD COLUMN IF NOT EXISTS package_type text,
  ADD COLUMN IF NOT EXISTS sender_name text,
  ADD COLUMN IF NOT EXISTS sender_phone text,
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS recipient_phone text,
  ADD COLUMN IF NOT EXISTS payer_role text DEFAULT 'sender';

COMMENT ON COLUMN public.orders.order_type IS
  'Type de commande : marketplace (achat catalogue) ou express (coursier direct à la demande).';

-- 3. Colonnes express sur `delivery_assignments`
ALTER TABLE public.delivery_assignments
  ADD COLUMN IF NOT EXISTS is_express boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS package_description text,
  ADD COLUMN IF NOT EXISTS package_type text,
  ADD COLUMN IF NOT EXISTS sender_name text,
  ADD COLUMN IF NOT EXISTS sender_phone text,
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS recipient_phone text,
  ADD COLUMN IF NOT EXISTS pickup_lat double precision,
  ADD COLUMN IF NOT EXISTS pickup_lng double precision,
  ADD COLUMN IF NOT EXISTS dropoff_lat double precision,
  ADD COLUMN IF NOT EXISTS dropoff_lng double precision,
  ADD COLUMN IF NOT EXISTS payer_role text DEFAULT 'sender';

CREATE INDEX IF NOT EXISTS idx_delivery_assignments_express
  ON public.delivery_assignments(is_express, status)
  WHERE is_express = true;

-- 4. Protection du stock : ignorer les commandes express sans `listing_id`
CREATE OR REPLACE FUNCTION public.manage_listing_stock_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_quantity integer := GREATEST(COALESCE(NEW.quantity, 1), 1);
  v_item record;
  v_has_items boolean;
BEGIN
  -- Garde-fous : pas de trigger en réplication de stock ou sur course express sans article
  IF COALESCE(current_setting('daloa.skip_stock_trigger', true), '') = '1' THEN
    RETURN NEW;
  END IF;

  IF NEW.listing_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(auth.role(), '') = 'service_role' THEN
      RETURN NEW;
    END IF;

    IF NEW.variant_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.listings AS listing
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(listing.variants, '[]'::jsonb)) AS elements(item)
        WHERE listing.id = NEW.listing_id
          AND elements.item->>'id' = NEW.variant_id
          AND COALESCE(elements.item->>'active', 'true') <> 'false'
          AND COALESCE(NULLIF(elements.item->>'stock', '')::integer, 0) >= v_quantity
      ) THEN
        RAISE EXCEPTION 'Variante indisponible ou stock insuffisant';
      END IF;
    END IF;

    UPDATE public.listings AS l
    SET
      variants = CASE
        WHEN NEW.variant_id IS NULL THEN l.variants
        ELSE COALESCE((
          SELECT jsonb_agg(
            CASE
              WHEN item->>'id' = NEW.variant_id THEN
                jsonb_set(item, '{stock}',
                  to_jsonb(GREATEST(0, COALESCE(NULLIF(item->>'stock', '')::integer, 0) - v_quantity)),
                  true)
              ELSE item
            END
            ORDER BY ord)
          FROM jsonb_array_elements(COALESCE(l.variants, '[]'::jsonb)) WITH ORDINALITY AS elements(item, ord)
        ), '[]'::jsonb)
      END,
      stock = GREATEST(0, l.stock - v_quantity),
      status = CASE WHEN GREATEST(0, l.stock - v_quantity) = 0 THEN 'sold' ELSE l.status END
    WHERE l.id = NEW.listing_id;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
      SELECT EXISTS (SELECT 1 FROM order_items WHERE order_id = NEW.id) INTO v_has_items;

      IF v_has_items THEN
        FOR v_item IN
          SELECT listing_id, variant_id::text AS variant_id, quantity
          FROM order_items WHERE order_id = NEW.id
        LOOP
          PERFORM fn_restore_listing_stock(v_item.listing_id, v_item.variant_id, v_item.quantity);
        END LOOP;
      ELSE
        PERFORM fn_restore_listing_stock(NEW.listing_id, NEW.variant_id, v_quantity);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. RPC de création de course express hors-market
CREATE OR REPLACE FUNCTION public.create_express_delivery_run(
  p_pickup_district     text,
  p_pickup_address      text,
  p_pickup_lat          double precision DEFAULT NULL,
  p_pickup_lng          double precision DEFAULT NULL,
  p_dropoff_district    text DEFAULT 'Daloa',
  p_dropoff_address     text DEFAULT '',
  p_dropoff_lat         double precision DEFAULT NULL,
  p_dropoff_lng         double precision DEFAULT NULL,
  p_package_type        text DEFAULT 'parcel',
  p_package_description text DEFAULT '',
  p_sender_name         text DEFAULT '',
  p_sender_phone        text DEFAULT '',
  p_recipient_name      text DEFAULT '',
  p_recipient_phone     text DEFAULT '',
  p_payer_role          text DEFAULT 'sender',
  p_payment_method      text DEFAULT 'cash',
  p_road_km             numeric DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $fn$
DECLARE
  v_sender_id      uuid := auth.uid();
  v_user_profile   record;
  v_sp             record;
  v_bp             record;
  v_straight_km    numeric;
  v_km             numeric;
  v_fee            integer;
  v_commission     integer;
  v_pickup_otp     text;
  v_delivery_otp   text;
  v_order_id       uuid;
  v_assignment_id  uuid;
  v_pickup_clean   text;
  v_dropoff_clean  text;
  v_sender_n       text;
  v_sender_p       text;
BEGIN
  IF v_sender_id IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'unauthenticated');
  END IF;

  SELECT full_name, phone, district INTO v_user_profile
    FROM users WHERE id = v_sender_id;

  v_sender_n := COALESCE(NULLIF(trim(p_sender_name), ''), v_user_profile.full_name, 'Expéditeur');
  v_sender_p := COALESCE(NULLIF(trim(p_sender_phone), ''), v_user_profile.phone, '');

  -- Résolution des positions géographiques officielles de Daloa
  SELECT * INTO v_sp FROM fn_daloa_point(p_pickup_lat, p_pickup_lng, p_pickup_district);
  SELECT * INTO v_bp FROM fn_daloa_point(p_dropoff_lat, p_dropoff_lng, p_dropoff_district);

  -- Calcul kilométrique et tarif officiel certifié
  v_straight_km := fn_straight_km(v_sp.latitude, v_sp.longitude, v_bp.latitude, v_bp.longitude);
  v_km          := fn_reconcile_road_km(p_road_km, v_straight_km);
  v_fee         := fn_delivery_fee(v_km);
  v_commission  := round(v_fee * 0.10); -- 10% commission plateforme, 90% livreur

  -- Codes de sécurité OTP 6 chiffres (1 pour ramassage, 1 pour dépôt)
  v_pickup_otp   := lpad((floor(random() * 1000000))::integer::text, 6, '0');
  v_delivery_otp := lpad((floor(random() * 1000000))::integer::text, 6, '0');

  v_pickup_clean  := trim(COALESCE(p_pickup_address, '')) || ' (' || trim(COALESCE(p_pickup_district, 'Daloa')) || ')';
  v_dropoff_clean := trim(COALESCE(p_dropoff_address, '')) || ' (' || trim(COALESCE(p_dropoff_district, 'Daloa')) || ')';

  -- Création de la commande express
  INSERT INTO orders (
    buyer_id,
    seller_id,
    listing_id,
    order_type,
    delivery_mode,
    payment_method,
    delivery_address,
    delivery_lat,
    delivery_lng,
    distance_km,
    product_amount,
    delivery_fee,
    platform_commission,
    reserve_fee,
    total_amount,
    status,
    package_description,
    package_type,
    sender_name,
    sender_phone,
    recipient_name,
    recipient_phone,
    payer_role
  ) VALUES (
    v_sender_id,
    v_sender_id,
    NULL,
    'express',
    'delivery',
    p_payment_method,
    v_dropoff_clean,
    v_bp.latitude,
    v_bp.longitude,
    v_km,
    0,
    v_fee,
    v_commission,
    0,
    v_fee,
    'pending',
    COALESCE(NULLIF(trim(p_package_description), ''), 'Colis Express Hors-Market'),
    COALESCE(NULLIF(trim(p_package_type), ''), 'parcel'),
    v_sender_n,
    v_sender_p,
    COALESCE(NULLIF(trim(p_recipient_name), ''), 'Destinataire'),
    COALESCE(NULLIF(trim(p_recipient_phone), ''), ''),
    COALESCE(NULLIF(trim(p_payer_role), ''), 'sender')
  )
  RETURNING id INTO v_order_id;

  -- Création de la course dans le pool public DaloaDelivery
  INSERT INTO delivery_assignments (
    order_id,
    seller_id,
    is_private,
    is_express,
    status,
    pickup_confirmed_by_seller,
    pickup_location,
    dropoff_location,
    pickup_lat,
    pickup_lng,
    dropoff_lat,
    dropoff_lng,
    delivery_price,
    pickup_otp,
    delivery_otp,
    package_description,
    package_type,
    sender_name,
    sender_phone,
    recipient_name,
    recipient_phone,
    payer_role
  ) VALUES (
    v_order_id,
    v_sender_id,
    false, -- Public : ouvert à tous les coursiers DaloaDelivery
    true,
    'awaiting_pickup',
    true,  -- L'expéditeur a déjà validé la demande, prêt pour enlèvement
    v_pickup_clean,
    v_dropoff_clean,
    v_sp.latitude,
    v_sp.longitude,
    v_bp.latitude,
    v_bp.longitude,
    v_fee,
    v_pickup_otp,
    v_delivery_otp,
    COALESCE(NULLIF(trim(p_package_description), ''), 'Colis Express Hors-Market'),
    COALESCE(NULLIF(trim(p_package_type), ''), 'parcel'),
    v_sender_n,
    v_sender_p,
    COALESCE(NULLIF(trim(p_recipient_name), ''), 'Destinataire'),
    COALESCE(NULLIF(trim(p_recipient_phone), ''), ''),
    COALESCE(NULLIF(trim(p_payer_role), ''), 'sender')
  )
  RETURNING id INTO v_assignment_id;

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'assignment_id', v_assignment_id,
    'delivery_fee', v_fee,
    'distance_km', v_km,
    'driver_net_gain', v_fee - v_commission,
    'pickup_otp', v_pickup_otp,
    'delivery_otp', v_delivery_otp
  );
END;
$fn$;

COMMENT ON FUNCTION public.create_express_delivery_run IS
  'Crée une course express directe hors-catalogue marketplace avec tarification kilométrique officielle et double OTP.';

GRANT EXECUTE ON FUNCTION public.create_express_delivery_run TO authenticated;
