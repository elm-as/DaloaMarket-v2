-- Devis de livraison calculé par le serveur (Railway, POST /quote).
--
-- Jusqu'ici chaque client (app, site) calculait son propre devis pour
-- l'afficher, puis le serveur recalculait au paiement : deux calculs sur des
-- données différentes (annonce en cache, itinéraire Mapbox obtenu deux fois),
-- d'où 806 F affichés et 1 044 F facturés le 25/09. Le devis est désormais
-- calculé une fois, enregistré ici, affiché tel quel, puis facturé tel quel
-- par /create-payment (en ligne) et create_cod_order (à la livraison).

CREATE TABLE IF NOT EXISTS public.delivery_quotes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delivery_mode    text NOT NULL CHECK (delivery_mode IN ('delivery', 'pickup_point')),
  -- Point de livraison RÉSOLU (GPS, sinon quartier, sinon centre).
  buyer_lat        double precision,
  buyer_lng        double precision,
  district         text,
  delivery_address text,
  -- [{listing_id, seller_id, variant_id, variant_label, unit_price, quantity, product_amount, platform_fee}]
  items            jsonb NOT NULL,
  -- [{seller_id, distance_km, delivery_fee, buyer_fee, product_amount}]
  sellers          jsonb NOT NULL,
  product_total    integer NOT NULL,
  delivery_total   integer NOT NULL,
  buyer_fee_total  integer NOT NULL,
  total_amount     integer NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL,
  used_at          timestamptz,
  used_by          text
);

CREATE INDEX IF NOT EXISTS delivery_quotes_buyer_idx ON public.delivery_quotes (buyer_id, created_at DESC);

ALTER TABLE public.delivery_quotes ENABLE ROW LEVEL SECURITY;

-- Lecture de ses propres devis ; écriture réservée au serveur (service role).
DROP POLICY IF EXISTS delivery_quotes_select_own ON public.delivery_quotes;
CREATE POLICY delivery_quotes_select_own ON public.delivery_quotes
  FOR SELECT TO authenticated USING (buyer_id = auth.uid());

REVOKE ALL ON public.delivery_quotes FROM anon, authenticated;
GRANT SELECT ON public.delivery_quotes TO authenticated;

-- Zone de Daloa : 18 km → 10 km. Le quartier le plus éloigné (Tagoura) est à
-- 4,4 km du centre et toutes les boutiques enregistrées à moins de 4,3 km ;
-- 18 km laissait passer un point à 17 km (boutique déplacée le 25/09).
DO $$
DECLARE v_def text;
BEGIN
  v_def := pg_get_functiondef('public.fn_daloa_point(double precision,double precision,text)'::regprocedure);
  IF position('<= 18' IN v_def) = 0 THEN
    RAISE EXCEPTION 'fn_daloa_point : rayon attendu introuvable';
  END IF;
  EXECUTE replace(v_def, '<= 18', '<= 10');
END $$;

-- create_cod_order : paramètre p_quote_id. Avec un devis, la livraison, la
-- distance et les frais acheteur viennent du devis (plus du client) ; le prix
-- des articles est revérifié et un écart annule toute la commande.
DO $$
DECLARE
  v_def text;
  v_new text;
BEGIN
  v_def := pg_get_functiondef(
    E'public.create_cod_order(jsonb,text,text,text,double precision,double precision,text,jsonb)'::regprocedure
  );
  v_new := v_def;

  v_new := replace(v_new,
    E'p_road_km jsonb DEFAULT ''{}''::jsonb)',
    E'p_road_km jsonb DEFAULT ''{}''::jsonb, p_quote_id uuid DEFAULT NULL::uuid)');

  v_new := replace(v_new,
    E'  v_variant      text;\n',
    E'  v_variant      text;\n  v_dq           record;\n  v_qs           jsonb;\n  v_use_quote    boolean := false;\n');

  v_new := replace(v_new,
    E'  SELECT * INTO v_bp FROM fn_daloa_point(p_delivery_lat, p_delivery_lng, p_delivery_district);\n',
    E'  SELECT * INTO v_bp FROM fn_daloa_point(p_delivery_lat, p_delivery_lng, p_delivery_district);\n\n'
    || E'  -- Devis serveur : il fait foi pour la livraison et les frais.\n'
    || E'  IF p_quote_id IS NOT NULL THEN\n'
    || E'    SELECT * INTO v_dq FROM delivery_quotes WHERE id = p_quote_id AND buyer_id = v_buyer FOR UPDATE;\n'
    || E'    IF NOT FOUND THEN\n'
    || E'      RETURN json_build_object(''success'', false, ''reason'', ''quote_not_found'');\n'
    || E'    END IF;\n'
    || E'    IF v_dq.used_at IS NOT NULL THEN\n'
    || E'      RETURN json_build_object(''success'', false, ''reason'', ''quote_used'');\n'
    || E'    END IF;\n'
    || E'    IF v_dq.expires_at < now() THEN\n'
    || E'      RETURN json_build_object(''success'', false, ''reason'', ''quote_expired'');\n'
    || E'    END IF;\n'
    || E'    IF v_dq.delivery_mode <> v_mode_stored THEN\n'
    || E'      RETURN json_build_object(''success'', false, ''reason'', ''quote_mismatch'');\n'
    || E'    END IF;\n'
    || E'    v_use_quote := true;\n'
    || E'    IF NOT v_is_pickup THEN\n'
    || E'      SELECT v_dq.buyer_lat AS latitude, v_dq.buyer_lng AS longitude INTO v_bp;\n'
    || E'    END IF;\n'
    || E'  END IF;\n');

  v_new := replace(v_new,
    E'  FOR v_group IN\n',
    E'  BEGIN\n  FOR v_group IN\n');

  v_new := replace(v_new,
    E'    SELECT * INTO v_quote\n      FROM fn_delivery_quote(\n',
    E'    IF v_use_quote THEN\n'
    || E'      SELECT e INTO v_qs FROM jsonb_array_elements(v_dq.sellers) e\n'
    || E'       WHERE e->>''seller_id'' = v_group.seller_id::text;\n'
    || E'      IF v_qs IS NULL OR (v_qs->>''product_amount'')::integer <> v_group.product_amount THEN\n'
    || E'        RAISE EXCEPTION ''quote_stale'' USING ERRCODE = ''DQ001'';\n'
    || E'      END IF;\n'
    || E'      SELECT (v_qs->>''distance_km'')::numeric AS distance_km,\n'
    || E'             (v_qs->>''delivery_fee'')::integer AS delivery_fee\n'
    || E'        INTO v_quote;\n'
    || E'    ELSE\n'
    || E'    SELECT * INTO v_quote\n      FROM fn_delivery_quote(\n');

  v_new := replace(v_new,
    E'        v_is_pickup\n      );\n',
    E'        v_is_pickup\n      );\n    END IF;\n');

  v_new := replace(v_new,
    E'    v_buyer_fee   := round(v_group.product_amount * 0.02);',
    E'    v_buyer_fee   := CASE WHEN v_use_quote THEN (v_qs->>''buyer_fee'')::integer'
    || E' ELSE round(v_group.product_amount * 0.02) END;');

  v_new := replace(v_new,
    E'  END LOOP;\n\n  IF v_first_order IS NULL THEN\n',
    E'  END LOOP;\n'
    || E'  IF v_use_quote AND cardinality(v_order_ids) <> jsonb_array_length(v_dq.sellers) THEN\n'
    || E'    RAISE EXCEPTION ''quote_stale'' USING ERRCODE = ''DQ001'';\n'
    || E'  END IF;\n'
    || E'  EXCEPTION WHEN SQLSTATE ''DQ001'' THEN\n'
    || E'    -- Tout ce qui a été inséré dans ce bloc est annulé.\n'
    || E'    RETURN json_build_object(''success'', false, ''reason'', SQLERRM);\n'
    || E'  END;\n\n'
    || E'  IF v_use_quote THEN\n'
    || E'    UPDATE delivery_quotes SET used_at = now(), used_by = ''cod'' WHERE id = v_dq.id;\n'
    || E'  END IF;\n\n'
    || E'  IF v_first_order IS NULL THEN\n');

  -- Chaque remplacement doit avoir eu lieu.
  IF position('p_quote_id uuid' IN v_new) = 0
     OR position('v_use_quote    boolean' IN v_new) = 0
     OR position('quote_not_found' IN v_new) = 0
     OR position(E'  BEGIN\n  FOR v_group IN' IN v_new) = 0
     OR position('(v_qs->>''distance_km'')' IN v_new) = 0
     OR position(E'      );\n    END IF;\n' IN v_new) = 0
     OR position('(v_qs->>''buyer_fee'')' IN v_new) = 0
     OR position('used_by = ''cod''' IN v_new) = 0 THEN
    RAISE EXCEPTION 'create_cod_order : un remplacement n''a pas eu lieu';
  END IF;

  DROP FUNCTION public.create_cod_order(jsonb,text,text,text,double precision,double precision,text,jsonb);
  EXECUTE v_new;
END $$;

REVOKE ALL ON FUNCTION public.create_cod_order(jsonb,text,text,text,double precision,double precision,text,jsonb,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_cod_order(jsonb,text,text,text,double precision,double precision,text,jsonb,uuid) TO authenticated;
