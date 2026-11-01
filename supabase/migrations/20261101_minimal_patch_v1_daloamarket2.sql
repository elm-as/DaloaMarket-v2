-- ============================================================================
-- Migration: 20261101_minimal_patch_v1_daloamarket2.sql
-- Cible : Base de production V1 DaloaMarket2 (9 paramètres stricts)
-- Objectifs :
-- 1. Arrondir les frais de livraison au multiple de 50 FCFA (fin des 781 F, 1231 F)
-- 2. Supprimer les frais de réservation (reserve_fee / buyer_fee = 0) sur cash_at_shop et cod
-- 3. Compte test Google Store : simulation de succès sans insertion en base
-- ============================================================================

-- 1. Colonnes pour identifier les comptes de test (Google Reviewers)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_test_user boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_test_users boolean DEFAULT false;

-- 2. Arrondi officiel des frais de livraison au multiple de 50 FCFA
CREATE OR REPLACE FUNCTION public.fn_delivery_fee(p_km numeric)
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$
  SELECT (round((500 + CASE
    WHEN COALESCE(p_km, 0) > 1.5 THEN (p_km - 1.5) * 85
    ELSE 0
  END) / 50.0) * 50)::integer;
$$;

-- 3. create_cod_order minimal avec exactement les 9 paramètres de la base de production V1
CREATE OR REPLACE FUNCTION public.create_cod_order(
  p_items             jsonb,
  p_delivery_mode     text,
  p_payment_method    text,
  p_delivery_address  text,
  p_delivery_lat      double precision DEFAULT NULL,
  p_delivery_lng      double precision DEFAULT NULL,
  p_delivery_district text DEFAULT NULL,
  p_road_km           jsonb DEFAULT '{}'::jsonb,
  p_quote_id          uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $fn$
DECLARE
  v_buyer        uuid := auth.uid();
  v_is_pickup    boolean;
  v_mode_stored  text;
  v_fee_override numeric;
  v_bp           record;
  v_dq           record;
  v_qs           jsonb;
  v_use_quote    boolean := false;
  v_group        record;
  v_item         jsonb;
  v_quote        record;
  v_is_pro       boolean;
  v_seller_rate  numeric;
  v_seller_fee   integer;
  v_buyer_fee    integer;
  v_total        integer;
  v_order_id     uuid;
  v_first_order  uuid := NULL;
  v_order_ids    uuid[] := '{}';
  v_grand_total  integer := 0;
  v_qty          integer;
  v_variant      text;
  v_is_test      boolean := false;
BEGIN
  IF v_buyer IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'unauthenticated');
  END IF;

  -- Détection compte de test Google Store : simulation de succès sans pollution en base
  SELECT (COALESCE(is_test_user, false) OR COALESCE(is_test_users, false)) INTO v_is_test
    FROM public.users WHERE id = v_buyer;

  IF v_is_test THEN
    RETURN json_build_object(
      'success', true,
      'first_order_id', gen_random_uuid(),
      'order_ids', jsonb_build_array(gen_random_uuid()::text),
      'total_amount', 0,
      'is_test_simulation', true
    );
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN json_build_object('success', false, 'reason', 'empty_cart');
  END IF;

  IF p_payment_method NOT IN ('cod', 'cash_at_shop', 'cash') THEN
    RETURN json_build_object('success', false, 'reason', 'unsupported_payment_method');
  END IF;

  v_is_pickup   := p_delivery_mode IN ('pickup', 'pickup_point');
  v_mode_stored := CASE WHEN v_is_pickup THEN 'pickup_point' ELSE 'delivery' END;

  PERFORM set_config('daloa.skip_stock_trigger', '1', true);

  SELECT (value->>'seller_fee_override')::numeric INTO v_fee_override
    FROM system_settings WHERE key = 'phase_config';

  SELECT * INTO v_bp FROM fn_daloa_point(p_delivery_lat, p_delivery_lng, p_delivery_district);

  IF p_quote_id IS NOT NULL THEN
    SELECT * INTO v_dq FROM delivery_quotes WHERE id = p_quote_id AND buyer_id = v_buyer FOR UPDATE;
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'reason', 'quote_not_found');
    END IF;
    IF v_dq.used_at IS NOT NULL THEN
      RETURN json_build_object('success', false, 'reason', 'quote_used');
    END IF;
    IF v_dq.expires_at < now() THEN
      RETURN json_build_object('success', false, 'reason', 'quote_expired');
    END IF;
    IF v_dq.delivery_mode <> v_mode_stored THEN
      RETURN json_build_object('success', false, 'reason', 'quote_mismatch');
    END IF;
    v_use_quote := true;
    IF NOT v_is_pickup THEN
      SELECT v_dq.buyer_lat AS latitude, v_dq.buyer_lng AS longitude INTO v_bp;
    END IF;
  END IF;

  BEGIN
    FOR v_group IN
      SELECT s.seller_id,
             SUM(s.line_amount)::integer AS product_amount,
             SUM(s.quantity)::integer    AS total_qty,
             BOOL_AND(s.is_digital)      AS all_digital,
             (ARRAY_AGG(s.listing_id    ORDER BY s.ord))[1] AS first_listing_id,
             (ARRAY_AGG(s.variant_id    ORDER BY s.ord))[1] AS first_variant_id,
             (ARRAY_AGG(s.variant_label ORDER BY s.ord))[1] AS first_variant_label,
             (ARRAY_AGG(s.unit_price    ORDER BY s.ord))[1] AS first_unit_price,
             jsonb_agg(jsonb_build_object(
               'listing_id', s.listing_id,
               'variant_id', s.variant_id,
               'variant_label', s.variant_label,
               'unit_price', s.unit_price,
               'quantity', s.quantity,
               'product_amount', s.line_amount
             ) ORDER BY s.ord) AS items
        FROM (
          SELECT r.ord,
                 r.listing_id,
                 COALESCE(r.variant_id, var.elem->>'id')       AS variant_id,
                 COALESCE(r.variant_label, var.elem->>'label') AS variant_label,
                 GREATEST(1, COALESCE(r.quantity, 1))          AS quantity,
                 l.user_id                                     AS seller_id,
                 (COALESCE(l.category, '') = 'digital')        AS is_digital,
                 COALESCE((var.elem->>'price')::numeric, l.price)::integer AS unit_price,
                 (COALESCE((var.elem->>'price')::numeric, l.price)
                   * GREATEST(1, COALESCE(r.quantity, 1)))::integer        AS line_amount
            FROM ROWS FROM (
                   jsonb_to_recordset(p_items)
                     AS (listing_id uuid, variant_id text, variant_label text, quantity integer)
                 ) WITH ORDINALITY AS r(listing_id, variant_id, variant_label, quantity, ord)
            JOIN listings l ON l.id = r.listing_id AND l.status = 'active'
            LEFT JOIN LATERAL (
              SELECT e AS elem
                FROM jsonb_array_elements(COALESCE(l.variants, '[]'::jsonb)) e
               WHERE r.variant_id IS NOT NULL AND e->>'id' = r.variant_id
               LIMIT 1
            ) var ON true
        ) s
       GROUP BY s.seller_id
    LOOP
      IF v_use_quote THEN
        SELECT e INTO v_qs FROM jsonb_array_elements(v_dq.sellers) e
         WHERE e->>'seller_id' = v_group.seller_id::text;
        IF v_qs IS NULL OR (v_qs->>'product_amount')::integer <> v_group.product_amount THEN
          RAISE EXCEPTION 'quote_stale' USING ERRCODE = 'DQ001';
        END IF;
        SELECT (v_qs->>'distance_km')::numeric AS distance_km,
               CASE WHEN v_group.all_digital THEN 0 ELSE (v_qs->>'delivery_fee')::integer END AS delivery_fee
          INTO v_quote;
      ELSE
        SELECT q.distance_km,
               CASE WHEN v_group.all_digital THEN 0 ELSE q.delivery_fee END AS delivery_fee
          INTO v_quote
          FROM fn_delivery_quote(
            v_group.seller_id,
            v_bp.latitude,
            v_bp.longitude,
            p_delivery_district,
            (p_road_km ->> v_group.seller_id::text)::numeric,
            v_is_pickup OR v_group.all_digital
          ) q;
      END IF;

      SELECT (pro_until IS NOT NULL AND pro_until > now()) INTO v_is_pro
        FROM users WHERE id = v_group.seller_id;

      v_seller_rate := COALESCE(v_fee_override, CASE WHEN v_is_pro THEN 0.025 ELSE 0.035 END);
      v_seller_fee  := round(v_group.product_amount * v_seller_rate);

      -- Zéro frais acheteur de réservation/protection sur les commandes en espèces
      v_buyer_fee   := 0;
      v_total       := v_group.product_amount + v_quote.delivery_fee;

      INSERT INTO orders (
        buyer_id, seller_id, listing_id, variant_id, variant_label, unit_price,
        quantity, product_amount, delivery_fee, platform_commission, reserve_fee,
        total_amount, status, delivery_mode, payment_method,
        delivery_address, delivery_lat, delivery_lng, distance_km
      ) VALUES (
        v_buyer, v_group.seller_id, v_group.first_listing_id, v_group.first_variant_id,
        v_group.first_variant_label, v_group.first_unit_price,
        v_group.total_qty, v_group.product_amount, v_quote.delivery_fee, v_seller_fee, v_buyer_fee,
        v_total, 'pending', v_mode_stored, p_payment_method,
        COALESCE(NULLIF(p_delivery_address, ''), 'Daloa'),
        CASE WHEN v_is_pickup THEN NULL ELSE v_bp.latitude END,
        CASE WHEN v_is_pickup THEN NULL ELSE v_bp.longitude END,
        v_quote.distance_km
      )
      RETURNING id INTO v_order_id;

      FOR v_item IN SELECT * FROM jsonb_array_elements(v_group.items) LOOP
        v_qty     := (v_item->>'quantity')::integer;
        v_variant := v_item->>'variant_id';

        INSERT INTO order_items (
          order_id, listing_id, variant_id, variant_label, unit_price, quantity, product_amount
        ) VALUES (
          v_order_id,
          (v_item->>'listing_id')::uuid,
          CASE WHEN v_variant ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN v_variant::uuid ELSE NULL END,
          v_item->>'variant_label',
          (v_item->>'unit_price')::numeric,
          v_qty,
          (v_item->>'product_amount')::numeric
        );

        UPDATE listings l
           SET stock  = GREATEST(0, COALESCE(l.stock, 0) - v_qty),
               status = CASE WHEN GREATEST(0, COALESCE(l.stock, 0) - v_qty) = 0 THEN 'sold' ELSE l.status END,
               variants = CASE
                 WHEN v_variant IS NULL THEN l.variants
                 ELSE COALESCE((
                   SELECT jsonb_agg(
                     CASE
                       WHEN item->>'id' = v_variant THEN
                         jsonb_set(item, '{stock}', to_jsonb(GREATEST(0, COALESCE(NULLIF(item->>'stock', '')::integer, 0) - v_qty)), true)
                       ELSE item
                     END ORDER BY ord
                   )
                   FROM jsonb_array_elements(COALESCE(l.variants, '[]'::jsonb)) WITH ORDINALITY AS elements(item, ord)
                 ), '[]'::jsonb)
               END
         WHERE l.id = (v_item->>'listing_id')::uuid;
      END LOOP;

      INSERT INTO delivery_assignments (
        order_id, seller_id, is_private, status,
        pickup_confirmed_by_seller, pickup_location, dropoff_location,
        delivery_price, pickup_otp, delivery_otp
      ) VALUES (
        v_order_id, v_group.seller_id, true, 'pending_seller_confirmation',
        v_is_pickup, 'Boutique du vendeur',
        COALESCE(NULLIF(p_delivery_address, ''), 'Retrait en boutique'),
        v_quote.delivery_fee,
        lpad((floor(random() * 1000000))::integer::text, 6, '0'),
        lpad((floor(random() * 1000000))::integer::text, 6, '0')
      );

      v_order_ids   := v_order_ids || v_order_id;
      v_grand_total := v_grand_total + v_total;
      IF v_first_order IS NULL THEN
        v_first_order := v_order_id;
      END IF;
    END LOOP;

    IF v_use_quote AND cardinality(v_order_ids) <> jsonb_array_length(v_dq.sellers) THEN
      RAISE EXCEPTION 'quote_stale' USING ERRCODE = 'DQ001';
    END IF;
  EXCEPTION WHEN SQLSTATE 'DQ001' THEN
    RETURN json_build_object('success', false, 'reason', SQLERRM);
  END;

  IF v_use_quote THEN
    UPDATE delivery_quotes SET used_at = now(), used_by = 'cod' WHERE id = v_dq.id;
  END IF;

  IF v_first_order IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'no_active_listing');
  END IF;

  RETURN json_build_object(
    'success', true,
    'first_order_id', v_first_order,
    'order_ids', to_jsonb(v_order_ids),
    'total_amount', v_grand_total
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.create_cod_order(jsonb, text, text, text, double precision, double precision, text, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_cod_order(jsonb, text, text, text, double precision, double precision, text, jsonb, uuid) TO authenticated;
