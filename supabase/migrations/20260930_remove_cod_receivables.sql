-- Suppression des créances « espèces » (cod_receivables).
--
-- Décision du 30/09/2026 : on ne suit plus la commission due sur les ventes
-- payées à la livraison. Ceux qui peuvent proposer le paiement à la livraison
-- auront un abonnement : c'est lui qui rémunère la plateforme.
--
-- Les deux fonctions de clôture sont réécrites à partir de leur définition en
-- base, sans l'appel à record_cod_receivable ; le reste est inchangé.

do $$
declare
  v_def text;
  v_new text;
begin
  -- verify_delivery : branche espèces supprimée
  select pg_get_functiondef('public.verify_delivery(uuid, text, text, double precision, double precision)'::regprocedure)
    into v_def;
  v_new := replace(v_def,
    E'\n  else\n    -- Especes : rien a reverser, on enregistre la creance de la plateforme\n    perform record_cod_receivable(assignment.order_id);\n  end if;',
    E'\n  end if;');
  if v_new = v_def then
    raise exception 'verify_delivery : appel record_cod_receivable introuvable';
  end if;
  execute v_new;

  -- complete_pickup_order : plus de créance au retrait payé en espèces
  select pg_get_functiondef('public.complete_pickup_order(uuid, text)'::regprocedure)
    into v_def;
  v_new := replace(v_def,
    E'    -- Espèces : le vendeur a encaissé, on enregistre la créance\n    perform record_cod_receivable(p_order_id);\n',
    E'    -- Espèces : le vendeur a encaissé, rien à reverser.\n');
  if v_new = v_def then
    raise exception 'complete_pickup_order : appel record_cod_receivable introuvable';
  end if;
  execute v_new;
end $$;

drop function if exists public.record_cod_receivable(uuid);
drop function if exists public.settle_cod_receivable(uuid, text);
drop view if exists public.cod_receivables_outstanding;
drop table if exists public.cod_receivables;
