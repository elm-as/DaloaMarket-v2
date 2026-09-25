-- create_cod_order applique enfin les règles de phase.
--
-- En phase 1, le paiement à la livraison et le retrait en boutique sont
-- réservés aux vendeurs Pro (sauf si l'admin les rouvre à tous). Jusqu'ici ce
-- n'était qu'un filtre d'affichage : l'app proposait le COD à tous et la base
-- ne vérifiait rien. Contrôle fait pour chaque vendeur du panier AVANT toute
-- création, pour ne jamais laisser une commande à moitié créée.
-- En phase 0 (allow_*_for_all = true) rien ne change.
do $$
declare
  v_def    text;
  v_new    text;
  v_anchor text := '  SELECT * INTO v_bp FROM fn_daloa_point(p_delivery_lat, p_delivery_lng, p_delivery_district);';
  v_check  text;
begin
  v_def := pg_get_functiondef('public.create_cod_order'::regproc);
  if position('cod_not_allowed' in v_def) > 0 then
    raise notice 'create_cod_order : règles de phase déjà présentes';
    return;
  end if;
  if position(v_anchor in v_def) = 0 then
    raise exception 'create_cod_order : point d''insertion introuvable';
  end if;

  v_check := $chk$
  -- Règles de phase : COD et retrait réservés au Pro si la phase ne les ouvre pas à tous.
  DECLARE
    v_allow_cod    boolean;
    v_allow_pickup boolean;
    v_blocked      uuid;
  BEGIN
    SELECT COALESCE((value->>'allow_cod_for_all')::boolean, true),
           COALESCE((value->>'allow_pickup_for_all')::boolean, true)
      INTO v_allow_cod, v_allow_pickup
      FROM system_settings WHERE key = 'phase_config';
    v_allow_cod    := COALESCE(v_allow_cod, true);
    v_allow_pickup := COALESCE(v_allow_pickup, true);

    IF (v_is_pickup AND NOT v_allow_pickup) OR (NOT v_is_pickup AND p_payment_method = 'cod' AND NOT v_allow_cod) THEN
      SELECT l.user_id INTO v_blocked
        FROM jsonb_to_recordset(p_items) AS r(listing_id uuid)
        JOIN listings l ON l.id = r.listing_id
        JOIN users u ON u.id = l.user_id
       WHERE NOT (u.pro_until IS NOT NULL AND u.pro_until > now())
       LIMIT 1;
      IF v_blocked IS NOT NULL THEN
        RETURN json_build_object(
          'success', false,
          'reason', CASE WHEN v_is_pickup THEN 'pickup_not_allowed' ELSE 'cod_not_allowed' END,
          'seller_id', v_blocked
        );
      END IF;
    END IF;
  END;

$chk$;

  v_new := replace(v_def, v_anchor, v_check || v_anchor);
  execute v_new;
end $$;
