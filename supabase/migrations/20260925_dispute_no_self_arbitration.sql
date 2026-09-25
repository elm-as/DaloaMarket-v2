-- Litiges : pas d'arbitrage de ses propres courses.
--
-- Un compte peut être admin ET livreur (ou acheteur/vendeur). Sans garde-fou,
-- il pouvait trancher un litige sur une course où il est partie prenante — et
-- donc se payer ou se rembourser lui-même. resolve_delivery_dispute refuse
-- désormais quand le médiateur est le livreur de la course, l'acheteur ou le
-- vendeur de la commande. Seule cette vérification est ajoutée.
do $$
declare
  v_def text;
  v_new text;
  v_anchor text := '  -- 5. Exécuter l''action demandée par le médiateur';
begin
  v_def := pg_get_functiondef('public.resolve_delivery_dispute'::regproc);
  if position('conflict_of_interest' in v_def) > 0 then
    raise notice 'resolve_delivery_dispute : garde-fou déjà présent';
    return;
  end if;
  if position(v_anchor in v_def) = 0 then
    raise exception 'resolve_delivery_dispute : point d''insertion introuvable';
  end if;
  v_new := replace(v_def, v_anchor,
    '  -- 4 bis. Pas d''arbitrage de ses propres courses (admin ET livreur, acheteur ou vendeur)' || chr(10) ||
    '  IF v_mediator_id IN (order_record.buyer_id, order_record.seller_id)' || chr(10) ||
    '     OR EXISTS (SELECT 1 FROM public.delivery_persons dp' || chr(10) ||
    '                 WHERE dp.id = assignment.delivery_person_id AND dp.user_id = v_mediator_id) THEN' || chr(10) ||
    '    RETURN json_build_object(''success'', false, ''reason'', ''conflict_of_interest'');' || chr(10) ||
    '  END IF;' || chr(10) || chr(10) ||
    v_anchor);
  execute v_new;
end $$;
