-- ============================================================================
-- La base devient l'autorité du prix des commandes en espèces (COD)
--
-- Jusqu'ici le web et le mobile calculaient chacun distance et montants, puis
-- écrivaient directement dans `orders`. Trois implémentations, trois résultats
-- pour le même panier, et un client modifié pouvait écrire le montant de son
-- choix. `create_cod_order` devient le seul chemin d'écriture : les clients
-- n'envoient que des articles et des coordonnées.
--
-- Distance routière : une fonction SQL ne peut pas appeler Mapbox de façon
-- synchrone (`pg_net` est asynchrone). Le client transmet donc la distance
-- routière qu'il a obtenue, et la base ne la retient que si elle est plausible
-- au regard du vol d'oiseau qu'elle recalcule elle-même — sinon elle applique
-- sa propre estimation. Voir `fn_reconcile_road_km`.
--
-- Référence TypeScript : packages/config/src/pricing.ts (DELIVERY_DISTANCE_RULE,
-- calculateDeliveryFee) et packages/utils/src/quote.ts.
-- ============================================================================

-- 1. Distance facturée, jusqu'ici stockée nulle part (seulement dans les
--    métadonnées escrow) : impossible d'auditer un prix après coup.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS distance_km numeric;

COMMENT ON COLUMN public.orders.distance_km IS
  'Distance retenue pour facturer la livraison, en km (bornée 0.5–15).';


-- 2. Barycentres de quartiers — repli quand un vendeur ou un acheteur n'a pas
--    de GPS exploitable. Miroir de DALOA_DISTRICT_COORDINATES.
CREATE TABLE IF NOT EXISTS public.daloa_districts (
  name      text PRIMARY KEY,
  latitude  double precision NOT NULL,
  longitude double precision NOT NULL
);

ALTER TABLE public.daloa_districts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daloa_districts_select_all ON public.daloa_districts;
CREATE POLICY daloa_districts_select_all ON public.daloa_districts
  FOR SELECT USING (true);

INSERT INTO public.daloa_districts (name, latitude, longitude) VALUES
  ('Tazibouo', 6.8795, -6.4488),
  ('Balouzon', 6.9044, -6.4234),
  ('Lobia', 6.8977, -6.4492),
  ('Abattoir', 6.8611, -6.4341),
  ('Commerce', 6.8900, -6.4449),
  ('Centre-ville', 6.8850, -6.4470),
  ('Kennedy', 6.8835, -6.4520),
  ('Gbokora', 6.9147, -6.4484),
  ('Huberson', 6.8811, -6.4658),
  ('Suisse', 6.8724, -6.4432),
  ('Belle-ville', 6.8750, -6.4579),
  ('Millionnaire', 6.8883, -6.4558),
  ('Odjenecourani', 6.8689, -6.4500),
  ('Institut Pastoral', 6.9027, -6.4406),
  ('Palmeraie', 6.8784, -6.4514),
  ('Orly', 6.8710, -6.4560),
  ('Dioulabougou', 6.8850, -6.4480),
  ('Quartier Baoulé', 6.8792, -6.4565),
  ('Savonnerie', 6.8730, -6.4510),
  ('Évêché', 6.8800, -6.4450),
  ('Garage', 6.8870, -6.4580),
  ('Soleil', 6.8920, -6.4380),
  ('Texas', 6.8760, -6.4460),
  ('Labia', 6.8910, -6.4510),
  ('Fadiga', 6.8820, -6.4490),
  ('Marin', 6.8840, -6.4550),
  ('Cissoko', 6.8780, -6.4440),
  ('Gbeulville', 6.8830, -6.4390),
  ('Cafop', 6.8690, -6.4620),
  ('Koyakabougou', 6.8950, -6.4520),
  ('Liberia', 6.8740, -6.4380),
  ('Manioc', 6.8670, -6.4460),
  ('Mossibougou', 6.8880, -6.4410),
  ('Sapia', 6.9080, -6.4350),
  ('Wolof', 6.8860, -6.4450),
  ('Tagoura', 6.9150, -6.4380),
  ('Tapeguhe', 6.8600, -6.4550)
ON CONFLICT (name) DO UPDATE
  SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;


-- 3. Primitives du devis — mêmes règles que le TypeScript, mêmes bornes.

CREATE OR REPLACE FUNCTION public.fn_clamp_km(p_km numeric)
RETURNS numeric
LANGUAGE sql IMMUTABLE
AS $$
  SELECT LEAST(15.0, GREATEST(0.5, round(COALESCE(p_km, 0.5), 1)));
$$;

/* Haversine en SQL : mêmes constantes que packages/utils/src/geo.ts. */
CREATE OR REPLACE FUNCTION public.fn_straight_km(
  p_lat1 double precision, p_lng1 double precision,
  p_lat2 double precision, p_lng2 double precision
)
RETURNS numeric
LANGUAGE sql IMMUTABLE
AS $$
  SELECT (6371 * 2 * asin(sqrt(
           power(sin(radians(p_lat2 - p_lat1) / 2), 2) +
           cos(radians(p_lat1)) * cos(radians(p_lat2)) *
           power(sin(radians(p_lng2 - p_lng1) / 2), 2)
         )))::numeric;
$$;

/* Retient la distance routière transmise seulement si elle est plausible. */
CREATE OR REPLACE FUNCTION public.fn_reconcile_road_km(
  p_road_km  numeric,
  p_straight numeric
)
RETURNS numeric
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_estimated numeric := fn_clamp_km(p_straight * 1.3);
  v_bounded   numeric;
BEGIN
  IF p_road_km IS NULL OR p_road_km <= 0 THEN
    RETURN v_estimated;
  END IF;

  v_bounded := fn_clamp_km(p_road_km);

  -- Une route ne peut pas être plus courte que le vol d'oiseau, ni presque
  -- deux fois plus longue à l'échelle de Daloa.
  IF v_bounded + 0.05 < fn_clamp_km(p_straight) THEN
    RETURN v_estimated;
  END IF;
  IF p_straight > 0 AND v_bounded > p_straight * 1.8 THEN
    RETURN v_estimated;
  END IF;

  RETURN v_bounded;
END;
$$;

/* Grille officielle : 500 FCFA jusqu'à 1,5 km, puis 85 FCFA/km. */
CREATE OR REPLACE FUNCTION public.fn_delivery_fee(p_km numeric)
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$
  SELECT 500 + CASE
    WHEN COALESCE(p_km, 0) > 1.5 THEN round((p_km - 1.5) * 85)::integer
    ELSE 0
  END;
$$;

/* Point retenu pour un participant : GPS si dans Daloa (18 km), sinon quartier,
   sinon centre-ville. */
CREATE OR REPLACE FUNCTION public.fn_daloa_point(
  p_lat      double precision,
  p_lng      double precision,
  p_district text
)
RETURNS TABLE (latitude double precision, longitude double precision)
LANGUAGE plpgsql STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_center_lat double precision := 6.8773;
  v_center_lng double precision := -6.4502;
  v_row        record;
BEGIN
  IF p_lat IS NOT NULL AND p_lng IS NOT NULL
     AND fn_straight_km(p_lat, p_lng, v_center_lat, v_center_lng) <= 18 THEN
    RETURN QUERY SELECT p_lat, p_lng;
    RETURN;
  END IF;

  IF p_district IS NOT NULL THEN
    SELECT d.latitude, d.longitude INTO v_row
      FROM daloa_districts d WHERE d.name = p_district;
    IF FOUND THEN
      RETURN QUERY SELECT v_row.latitude, v_row.longitude;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT v_center_lat, v_center_lng;
END;
$$;

/* Devis complet pour un vendeur donné — utilisable aussi pour un simple aperçu. */
CREATE OR REPLACE FUNCTION public.fn_delivery_quote(
  p_seller_id       uuid,
  p_buyer_lat       double precision,
  p_buyer_lng       double precision,
  p_buyer_district  text,
  p_road_km         numeric DEFAULT NULL,
  p_is_pickup       boolean DEFAULT false
)
RETURNS TABLE (distance_km numeric, delivery_fee integer)
LANGUAGE plpgsql STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_seller   record;
  v_sp       record;
  v_bp       record;
  v_straight numeric;
  v_km       numeric;
BEGIN
  SELECT shop_latitude, shop_longitude, district INTO v_seller
    FROM users WHERE id = p_seller_id;

  SELECT * INTO v_sp FROM fn_daloa_point(v_seller.shop_latitude, v_seller.shop_longitude, v_seller.district);
  SELECT * INTO v_bp FROM fn_daloa_point(p_buyer_lat, p_buyer_lng, p_buyer_district);

  v_straight := fn_straight_km(v_sp.latitude, v_sp.longitude, v_bp.latitude, v_bp.longitude);
  v_km := fn_reconcile_road_km(p_road_km, v_straight);

  RETURN QUERY SELECT v_km, CASE WHEN p_is_pickup THEN 0 ELSE fn_delivery_fee(v_km) END;
END;
$$;


-- 4. Création d'une commande en espèces — seul chemin d'écriture autorisé.
--
-- Le client n'envoie que des articles et une position. Prix unitaires, frais,
-- distance et regroupement par vendeur sont décidés ici. Une commande et une
-- course par VENDEUR (jamais par article, comme le faisait le web).
CREATE OR REPLACE FUNCTION public.create_cod_order(
  p_items             jsonb,
  p_delivery_mode     text,
  p_payment_method    text,
  p_delivery_address  text,
  p_delivery_lat      double precision DEFAULT NULL,
  p_delivery_lng      double precision DEFAULT NULL,
  p_delivery_district text DEFAULT NULL,
  p_road_km           jsonb DEFAULT '{}'::jsonb
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
BEGIN
  IF v_buyer IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'unauthenticated');
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN json_build_object('success', false, 'reason', 'empty_cart');
  END IF;

  IF p_payment_method NOT IN ('cod', 'cash_at_shop', 'cash') THEN
    RETURN json_build_object('success', false, 'reason', 'unsupported_payment_method');
  END IF;

  v_is_pickup   := p_delivery_mode IN ('pickup', 'pickup_point');
  v_mode_stored := CASE WHEN v_is_pickup THEN 'pickup_point' ELSE 'delivery' END;

  -- Le stock est géré ici, article par article : on neutralise le décompte
  -- global du déclencheur pour cette transaction seulement (voir section 6).
  PERFORM set_config('daloa.skip_stock_trigger', '1', true);

  SELECT (value->>'seller_fee_override')::numeric INTO v_fee_override
    FROM system_settings WHERE key = 'phase_config';

  -- Position de livraison retenue : c'est elle qui est stockée, pour que la
  -- distance facturée reste rejouable après coup.
  SELECT * INTO v_bp FROM fn_daloa_point(p_delivery_lat, p_delivery_lng, p_delivery_district);

  FOR v_group IN
    SELECT s.seller_id,
           SUM(s.line_amount)::integer AS product_amount,
           SUM(s.quantity)::integer    AS total_qty,
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
               COALESCE((var.elem->>'price')::numeric, l.price)::integer AS unit_price,
               (COALESCE((var.elem->>'price')::numeric, l.price)
                 * GREATEST(1, COALESCE(r.quantity, 1)))::integer        AS line_amount
          -- `WITH ORDINALITY` refuse une liste de colonnes en ligne :
          -- elle doit passer par ROWS FROM (...).
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
    SELECT * INTO v_quote
      FROM fn_delivery_quote(
        v_group.seller_id,
        v_bp.latitude,
        v_bp.longitude,
        p_delivery_district,
        (p_road_km ->> v_group.seller_id::text)::numeric,
        v_is_pickup
      );

    SELECT (pro_until IS NOT NULL AND pro_until > now()) INTO v_is_pro
      FROM users WHERE id = v_group.seller_id;

    v_seller_rate := COALESCE(v_fee_override, CASE WHEN v_is_pro THEN 0.025 ELSE 0.035 END);
    v_seller_fee  := round(v_group.product_amount * v_seller_rate);
    v_buyer_fee   := round(v_group.product_amount * 0.02);
    v_total       := v_group.product_amount + v_quote.delivery_fee + v_buyer_fee;

    -- `platform_commission` porte la commission VENDEUR et `reserve_fee` le
    -- frais de service ACHETEUR. Le checkout web écrivait l'inverse : selon
    -- l'écrivain, la même colonne changeait de sens.
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
        CASE
          WHEN v_variant ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN v_variant::uuid
          ELSE NULL
        END,
        v_item->>'variant_label',
        (v_item->>'unit_price')::numeric,
        v_qty,
        (v_item->>'product_amount')::numeric
      );

      -- Stock : chaque article de sa propre quantité, variante comprise.
      UPDATE listings l
         SET stock  = GREATEST(0, COALESCE(l.stock, 0) - v_qty),
             status = CASE WHEN GREATEST(0, COALESCE(l.stock, 0) - v_qty) = 0 THEN 'sold' ELSE l.status END,
             variants = CASE
               WHEN v_variant IS NULL THEN l.variants
               ELSE COALESCE((
                 SELECT jsonb_agg(
                   CASE
                     WHEN item->>'id' = v_variant THEN
                       jsonb_set(
                         item,
                         '{stock}',
                         to_jsonb(GREATEST(0, COALESCE(NULLIF(item->>'stock', '')::integer, 0) - v_qty)),
                         true
                       )
                     ELSE item
                   END
                   ORDER BY ord
                 )
                 FROM jsonb_array_elements(COALESCE(l.variants, '[]'::jsonb)) WITH ORDINALITY AS elements(item, ord)
               ), '[]'::jsonb)
             END
       WHERE l.id = (v_item->>'listing_id')::uuid;
    END LOOP;

    -- Une course par vendeur. En retrait boutique elle existe aussi (sans
    -- livreur, prix 0) : `complete_pickup_order` a besoin du code OTP qu'elle
    -- porte, sinon la validation en boutique répond `assignment_not_found`.
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

COMMENT ON FUNCTION public.create_cod_order IS
  'Crée les commandes espèces (une par vendeur) en calculant elle-même distance et montants.';


-- 5. Surface d'appel : seule `create_cod_order` est exposée aux clients.
REVOKE ALL ON FUNCTION public.fn_daloa_point(double precision, double precision, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_cod_order(jsonb, text, text, text, double precision, double precision, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_cod_order(jsonb, text, text, text, double precision, double precision, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_delivery_quote(uuid, double precision, double precision, text, numeric, boolean) TO authenticated;


-- 6. Garde-fou du déclencheur de stock
--
-- `manage_listing_stock_on_order` décrémente `orders.listing_id` de
-- `orders.quantity`. Pour une commande panier (plusieurs articles d'un même
-- vendeur dans une seule commande), il décrémente donc le PREMIER article de la
-- quantité TOTALE et ignore les autres — d'où le décompte manuel que faisait
-- `createCartOrders`, qui aboutissait à une double décrémentation du premier
-- article. Le drapeau posé par `create_cod_order`, valable pour la seule durée
-- de sa transaction, lui laisse la main. Les autres chemins d'écriture ne
-- posent pas le drapeau et gardent exactement le comportement actuel.
--
-- (Corps complet identique à l'existant, avec les trois lignes de garde en tête
--  — voir la migration appliquée `stock_trigger_guard_for_cod_rpc`.)
--   IF COALESCE(current_setting('daloa.skip_stock_trigger', true), '') = '1' THEN
--     RETURN NEW;
--   END IF;
