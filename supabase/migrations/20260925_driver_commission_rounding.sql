-- Commission livreur : un seul arrondi partout.
--
-- create_delivery_payout (livraison normale) retient round(frais × 10 %) ;
-- resolve_delivery_dispute (remboursement partiel, client absent) retenait
-- ceil(frais × 10 %) : 1 F de moins pour le livreur sur des frais non ronds.
-- On aligne le litige sur la règle principale. Seule cette expression change.
do $$
declare
  v_def text;
  v_new text;
begin
  v_def := pg_get_functiondef('public.resolve_delivery_dispute'::regproc);
  v_new := replace(v_def, 'CEIL(order_record.delivery_fee * 0.10)', 'ROUND(order_record.delivery_fee * 0.10)');
  if v_new = v_def then
    raise notice 'resolve_delivery_dispute : arrondi déjà aligné';
  else
    execute v_new;
  end if;
end $$;
