-- ============================================================================
-- Lots 0 et 1 de l'audit du 24/09/2026
--
-- Lot 0 : le Pass Pro annuel n'est accordé qu'au prix annuel réel.
-- Lot 1 : toutes les transitions de statut passent par des fonctions
--         SECURITY DEFINER. Les UPDATE clients sur orders.status sont annulés
--         en silence par protect_orders_columns : les boutons « Expédier »,
--         « Annuler » (vendeur, COD) et « Litige » (commande sans course)
--         affichaient un succès sans rien changer.
-- ============================================================================


-- ── Lot 0 : seuil de l'abonnement annuel ────────────────────────────────────
-- Le seuil était 10 000 FCFA alors que l'annuel coûte 25 000 FCFA. Le montant
-- est désormais fixé par le serveur Railway, ce seuil ne sert plus qu'à
-- distinguer les deux formules.
CREATE OR REPLACE FUNCTION public.confirm_seller_badge(p_transaction_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid;
  v_amount  integer;
  v_days    integer;
begin
  select user_id, amount into v_user_id, v_amount
  from public.monetization_transactions
  where id = p_transaction_id;

  if not found then
    raise exception 'Transaction introuvable';
  end if;

  -- 25 000 FCFA = abonnement annuel (PRICING_CONFIG.proSubscription.annualPrice).
  if v_amount >= 25000 then
    v_days := 365;
  else
    v_days := 30;
  end if;

  update public.users
  set pro_until = case
        when pro_until is null or pro_until < now() then now() + (v_days || ' days')::interval
        else pro_until + (v_days || ' days')::interval
      end,
      pro_free_boost_used = false
  where id = v_user_id;

  -- Commission de parrainage. Isolee : un echec ici ne doit jamais empecher
  -- l'activation de l'abonnement que le vendeur vient de payer.
  begin
    perform public.credit_ambassador_pro_subscription(v_user_id);
  exception when others then
    raise warning 'Commission ambassadeur non versée pour %: %', v_user_id, sqlerrm;
  end;
end;
$function$;


-- ── 2a : le vendeur expédie lui-même une commande payée à la livraison ──────
-- Contrepartie serveur de « Marquer le colis comme expédié » (web et mobile).
-- La course privée créée par create_cod_order n'est pas touchée : elle reste
-- disponible si le vendeur préfère confier le colis à un livreur affilié.
CREATE OR REPLACE FUNCTION public.dispatch_cod_order(p_order_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_order record;
begin
  if auth.uid() is null then
    return json_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  select * into v_order from orders where id = p_order_id for update;
  if not found or v_order.seller_id <> auth.uid() then
    return json_build_object('success', false, 'reason', 'order_not_found');
  end if;

  if v_order.payment_method <> 'cod' or v_order.delivery_mode <> 'delivery' then
    return json_build_object('success', false, 'reason', 'not_cod_delivery');
  end if;

  if v_order.status = 'in_transit' then
    return json_build_object('success', true, 'status', 'in_transit');
  end if;

  if v_order.status <> 'pending' then
    return json_build_object('success', false, 'reason', 'invalid_status',
                             'current_status', v_order.status);
  end if;

  update orders set status = 'in_transit', updated_at = now() where id = p_order_id;

  return json_build_object('success', true, 'status', 'in_transit');
end;
$function$;

REVOKE ALL ON FUNCTION public.dispatch_cod_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_cod_order(uuid) TO authenticated;


-- ── 2b : annulation vendeur « je n'ai plus le produit » ─────────────────────
-- Deux ajouts :
--  * une commande payée en ligne (séquestre financé) est remboursée à
--    l'acheteur, comme dans cancel_order_buyer. Avant, le séquestre restait
--    bloqué et l'acheteur n'était jamais remboursé ;
--  * cancel_reason est renseigné pour l'historique.
CREATE OR REPLACE FUNCTION public.cancel_order_unavailable(p_order_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_order  record;
  v_escrow record;
  v_buyer  record;
  v_phone  text;
begin
  select * into v_order
  from orders
  where id = p_order_id
    and seller_id = auth.uid()
  for update;

  if not found then
    return json_build_object('success', false, 'reason', 'order_not_found');
  end if;

  if v_order.status not in ('paid', 'pending') then
    return json_build_object('success', false, 'reason', 'invalid_status',
                             'current_status', v_order.status);
  end if;

  select * into v_escrow from escrow_transactions
   where order_id = p_order_id and status in ('funded', 'held')
   limit 1;

  if v_escrow.id is not null then
    select * into v_buyer from users where id = v_order.buyer_id;
    v_phone := coalesce(nullif(v_buyer.payout_number, ''), nullif(v_buyer.phone, ''));

    if v_phone is not null then
      insert into payouts (user_id, escrow_id, amount, recipient_phone, withdraw_mode,
                           type, status, scheduled_for, idempotency_key)
      values (v_order.buyer_id, v_escrow.id, v_escrow.total_amount, v_phone,
              coalesce(nullif(v_buyer.payout_network, ''), 'orange-money-ci'),
              'refund', 'pending', now(),
              'payout_' || p_order_id || '_seller_unavailable')
      on conflict do nothing;
    end if;

    update escrow_transactions
       set status = 'refunded', refunded_at = now(), updated_at = now()
     where id = v_escrow.id;
  end if;

  update orders
     set status = 'cancelled', cancel_reason = 'seller_unavailable', updated_at = now()
   where id = p_order_id;

  update delivery_assignments
     set status = 'cancelled', updated_at = now()
   where order_id = p_order_id
     and status in ('pending_seller_confirmation', 'awaiting_pickup');

  return json_build_object('success', true, 'status', 'cancelled',
                           'refunded', v_escrow.id is not null);
end;
$function$;


-- ── 2d : litiges ─────────────────────────────────────────────────────────────
-- Écriture commune dans order_disputes : c'est la table qu'écoute l'alerte
-- Discord (trg_alert_dispute). Aucun litige n'y était jamais inscrit.
CREATE OR REPLACE FUNCTION public.fn_open_order_dispute(p_order_id uuid, p_raised_by uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_role text;
begin
  if exists (select 1 from order_disputes
              where order_id = p_order_id and status in ('open', 'reviewing')) then
    return;
  end if;

  select case
           when o.buyer_id = p_raised_by then 'Signalé par l''acheteur'
           when o.seller_id = p_raised_by then 'Signalé par le vendeur'
           when exists (select 1 from users u where u.id = p_raised_by
                         and u.role in ('admin', 'superadmin')) then 'Ouvert par l''administration'
           else 'Signalé par le livreur'
         end
    into v_role
    from orders o where o.id = p_order_id;

  insert into order_disputes (order_id, raised_by, reason, description, status)
  values (p_order_id, p_raised_by, v_role, left(coalesce(p_reason, ''), 2000), 'open');
end;
$function$;

REVOKE ALL ON FUNCTION public.fn_open_order_dispute(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

-- Litige sur une course : même comportement qu'avant, plus un contrôle de
-- statut (une commande annulée ou clôturée ne peut plus passer en litige) et
-- l'inscription dans order_disputes.
CREATE OR REPLACE FUNCTION public.report_delivery_dispute(p_assignment_id uuid, p_reason text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_assignment record;
  v_order record;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return json_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  select * into v_assignment from delivery_assignments where id = p_assignment_id;
  if not found then
    return json_build_object('success', false, 'reason', 'assignment_not_found');
  end if;

  select * into v_order from orders where id = v_assignment.order_id;
  if not found then
    return json_build_object('success', false, 'reason', 'order_not_found');
  end if;

  if v_order.buyer_id <> v_user_id
     and v_order.seller_id <> v_user_id
     and (v_assignment.delivery_person_id is null or
          (select user_id from delivery_persons where id = v_assignment.delivery_person_id) is distinct from v_user_id)
     and not exists (select 1 from users where id = v_user_id and role in ('admin', 'superadmin'))
  then
    return json_build_object('success', false, 'reason', 'unauthorized');
  end if;

  if v_order.status in ('cancelled', 'completed') then
    return json_build_object('success', false, 'reason', 'invalid_status',
                             'current_status', v_order.status);
  end if;

  if v_order.status = 'disputed' then
    return json_build_object('success', true, 'status', 'disputed');
  end if;

  update delivery_assignments
     set status = 'disputed', disputed_at = now(),
         dispute_reason = p_reason, updated_at = now()
   where id = p_assignment_id;

  update orders set status = 'disputed', updated_at = now()
   where id = v_assignment.order_id;

  perform fn_open_order_dispute(v_order.id, v_user_id, p_reason);

  return json_build_object('success', true);
end;
$function$;

-- Litige au niveau de la commande : fonctionne aussi pour une commande sans
-- course (retrait en boutique). Remplace le repli client qui écrivait
-- orders.status directement et restait sans effet.
CREATE OR REPLACE FUNCTION public.report_order_dispute(p_order_id uuid, p_reason text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_order record;
  v_assignment_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return json_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    return json_build_object('success', false, 'reason', 'reason_required');
  end if;

  select id into v_assignment_id from delivery_assignments
   where order_id = p_order_id
   order by created_at desc
   limit 1;

  if v_assignment_id is not null then
    return report_delivery_dispute(v_assignment_id, trim(p_reason));
  end if;

  select * into v_order from orders where id = p_order_id;
  if not found or (v_order.buyer_id <> v_user_id and v_order.seller_id <> v_user_id
                   and not exists (select 1 from users where id = v_user_id
                                    and role in ('admin', 'superadmin'))) then
    return json_build_object('success', false, 'reason', 'order_not_found');
  end if;

  if v_order.status in ('cancelled', 'completed') then
    return json_build_object('success', false, 'reason', 'invalid_status',
                             'current_status', v_order.status);
  end if;

  if v_order.status <> 'disputed' then
    update orders set status = 'disputed', cancel_reason = trim(p_reason), updated_at = now()
     where id = p_order_id;
    perform fn_open_order_dispute(p_order_id, v_user_id, trim(p_reason));
  end if;

  return json_build_object('success', true, 'status', 'disputed');
end;
$function$;

REVOKE ALL ON FUNCTION public.report_order_dispute(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_order_dispute(uuid, text) TO authenticated;


-- ── 2e : remise en main propre / encaissement ───────────────────────────────
-- Deux garde-fous manquaient :
--  * aucun contrôle de statut : une commande annulée ou en litige pouvait
--    passer « livrée » ;
--  * sur une commande payée en ligne, le VENDEUR pouvait appeler la fonction
--    sans code et déclencher le versement du séquestre à son profit. Le code
--    remis par l'acheteur est désormais exigé dans ce cas. L'acheteur (qui
--    libère son propre argent) et l'administration n'en ont pas besoin, pas
--    plus qu'une commande en espèces où aucun argent ne transite.
CREATE OR REPLACE FUNCTION public.complete_pickup_order(p_order_id uuid, p_entered_otp text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_order     record;
  v_escrow    record;
  v_assign    record;
  v_payout_id uuid;
  v_phone     text;
  v_network   text;
  v_amount    integer;
  v_caller    uuid := auth.uid();
  v_has_otp   boolean := p_entered_otp is not null and length(trim(p_entered_otp)) > 0;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    return json_build_object('success', false, 'message', 'Commande introuvable');
  end if;

  if not (v_caller is not null
          and (v_caller = v_order.seller_id
               or v_caller = v_order.buyer_id
               or is_admin_or_service_role())) then
    return json_build_object('success', false, 'reason', 'unauthorized');
  end if;

  if v_order.status = 'delivered' then
    return json_build_object('success', true, 'message', 'Commande déjà validée');
  end if;

  if v_order.status not in ('pending', 'paid', 'in_transit') then
    return json_build_object('success', false, 'reason', 'invalid_status',
                             'current_status', v_order.status);
  end if;

  select * into v_escrow from escrow_transactions where order_id = p_order_id limit 1;

  if v_escrow.id is not null
     and v_caller = v_order.seller_id
     and v_caller <> v_order.buyer_id
     and not is_admin_or_service_role()
     and not v_has_otp then
    return json_build_object('success', false, 'reason', 'otp_required');
  end if;

  select * into v_assign from delivery_assignments where order_id = p_order_id limit 1;

  if v_has_otp then
    if v_assign.id is null then
      return json_build_object('success', false, 'reason', 'assignment_not_found');
    end if;
    if coalesce(v_assign.delivery_otp, '') <> trim(p_entered_otp) then
      update delivery_assignments
         set delivery_otp_attempts = coalesce(delivery_otp_attempts, 0) + 1,
             updated_at = now()
       where id = v_assign.id;
      if coalesce(v_assign.delivery_otp_attempts, 0) + 1 >= 5 then
        update delivery_assignments
           set status = 'disputed', disputed_at = now(),
               dispute_reason = 'too_many_otp_attempts', updated_at = now()
         where id = v_assign.id;
        return json_build_object('success', false, 'reason', 'locked', 'status', 'disputed');
      end if;
      return json_build_object('success', false, 'reason', 'invalid_otp',
                               'attempts', coalesce(v_assign.delivery_otp_attempts, 0) + 1,
                               'max_attempts', 5);
    end if;
  end if;

  update orders set status = 'delivered', updated_at = now() where id = p_order_id;
  update delivery_assignments
     set status = 'delivered', delivered_at = now(),
         buyer_confirmed_at = now(), updated_at = now()
   where order_id = p_order_id;

  if v_escrow.id is null then
    -- Espèces : le vendeur a encaissé, on enregistre la créance
    perform record_cod_receivable(p_order_id);
    return json_build_object('success', true,
      'message', 'Retrait validé. Paiement en espèces encaissé par la boutique.',
      'payout_id', null);
  end if;

  update escrow_transactions
     set status = 'released', released_at = now(), updated_at = now()
   where id = v_escrow.id;

  v_amount := v_escrow.seller_amount;
  if v_amount is null or v_amount <= 0 then
    return json_build_object('success', true,
      'message', 'Retrait validé. Virement à vérifier manuellement : montant escrow indéterminé.',
      'payout_id', null);
  end if;

  select coalesce(payout_number, phone), payout_network
    into v_phone, v_network
    from users where id = v_order.seller_id;

  if v_phone is not null then
    insert into payouts (user_id, escrow_id, amount, recipient_phone, withdraw_mode,
                         type, status, scheduled_for, idempotency_key)
    values (v_order.seller_id, v_escrow.id, v_amount, v_phone,
            coalesce(v_network, 'wave-ci'), 'seller', 'pending', now(),
            'payout_' || p_order_id || '_seller')
    on conflict (idempotency_key) do update
      set status = 'pending', scheduled_for = now()
    returning id into v_payout_id;
  end if;

  return json_build_object('success', true,
    'message', 'Retrait validé avec succès et virement vendeur programmé !',
    'payout_id', v_payout_id);
end;
$function$;


-- ── Stock : décrément et restitution article par article ────────────────────
-- Deux défauts du trigger sur orders :
--  * INSERT : escrow.js (Railway, service_role) décrémente déjà chaque article
--    lui-même ; le trigger décrémentait une seconde fois l'article d'en-tête.
--    create_cod_order était déjà protégé par daloa.skip_stock_trigger.
--  * UPDATE → cancelled : l'en-tête porte le PREMIER article avec la quantité
--    TOTALE du panier. Toute la quantité revenait au premier article, rien aux
--    autres. La restitution suit maintenant order_items quand elles existent.
CREATE OR REPLACE FUNCTION public.fn_restore_listing_stock(p_listing_id uuid, p_variant_id text, p_quantity integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_qty integer := greatest(coalesce(p_quantity, 1), 1);
begin
  update listings as l
     set variants = case
           when p_variant_id is null then l.variants
           else coalesce((
             select jsonb_agg(
               case
                 when item->>'id' = p_variant_id then
                   jsonb_set(
                     -- escrow.js désactive une variante tombée à 0 : on la
                     -- réactive quand du stock revient.
                     case when coalesce(nullif(item->>'stock', '')::integer, 0) = 0
                          then item || '{"active": true}'::jsonb else item end,
                     '{stock}',
                     to_jsonb(coalesce(nullif(item->>'stock', '')::integer, 0) + v_qty),
                     true)
                 else item
               end
               order by ord)
             from jsonb_array_elements(coalesce(l.variants, '[]'::jsonb)) with ordinality as e(item, ord)
           ), '[]'::jsonb)
         end,
         stock = coalesce(l.stock, 0) + v_qty,
         status = case when l.status = 'sold' then 'active' else l.status end
   where l.id = p_listing_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.fn_restore_listing_stock(uuid, text, integer) FROM PUBLIC, anon, authenticated;

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
  IF COALESCE(current_setting('daloa.skip_stock_trigger', true), '') = '1' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Le serveur Railway gère lui-même le stock de chaque article.
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
