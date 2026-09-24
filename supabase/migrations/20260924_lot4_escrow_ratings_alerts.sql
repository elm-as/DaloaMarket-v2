-- ============================================================================
-- Lot 4 de l'audit du 24/09/2026 : séquestre, notes, alertes
-- ============================================================================


-- ── 1. Séquestre libéré au versement vendeur ────────────────────────────────
-- verify_delivery et resolve_delivery_dispute ('deliver') programment les
-- versements mais laissaient le séquestre en 'funded' : deux commandes livrées
-- apparaissaient encore comme de l'argent bloqué. Le statut `auto_released`
-- des courses n'est pas utilisé : la libération se fait au code OTP de
-- livraison, aucune tâche planifiée n'est nécessaire.
CREATE OR REPLACE FUNCTION public.create_seller_payout(p_order_id uuid, p_escrow_id uuid, p_seller_id uuid, p_seller_amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_order   record;
  v_escrow  record;
  v_amount  integer;
  v_phone   text;
  v_network text;
begin
  select * into v_order from orders where id = p_order_id;
  if not found or v_order.status <> 'delivered' then return; end if;

  select * into v_escrow from escrow_transactions
   where id = p_escrow_id and order_id = p_order_id
     and status in ('funded', 'released');
  if not found then return; end if;

  -- Bénéficiaire et montant : issus de la base, jamais des paramètres
  v_amount := v_escrow.seller_amount;
  if v_amount is null or v_amount <= 0 then return; end if;

  select coalesce(payout_number, phone), payout_network
    into v_phone, v_network
    from users where id = v_order.seller_id;
  if v_phone is null then return; end if;

  insert into payouts (user_id, escrow_id, amount, recipient_phone, withdraw_mode,
                       type, status, scheduled_for, idempotency_key)
  values (v_order.seller_id, p_escrow_id, v_amount, v_phone,
          coalesce(v_network, 'wave-ci'), 'seller', 'pending', now(),
          'payout_' || p_order_id || '_seller')
  on conflict do nothing;

  -- Le versement est programmé : l'argent ne dort plus dans le séquestre.
  update escrow_transactions
     set status = 'released', released_at = coalesce(released_at, now()), updated_at = now()
   where id = p_escrow_id and status = 'funded';
end;
$function$;

-- Rattrapage : commandes livrées dont le versement vendeur existe déjà.
UPDATE public.escrow_transactions e
   SET status = 'released', released_at = coalesce(e.released_at, now()), updated_at = now()
  FROM public.orders o
 WHERE o.id = e.order_id
   AND o.status IN ('delivered', 'completed')
   AND e.status = 'funded'
   AND EXISTS (SELECT 1 FROM public.payouts p WHERE p.escrow_id = e.id AND p.type = 'seller');


-- ── 2. Notes calculées par la base ──────────────────────────────────────────
-- Les applis recalculaient la note et l'écrivaient dans delivery_persons, ce
-- que protect_delivery_persons_columns annule en silence. La note des
-- vendeurs (users.rating) n'était, elle, calculée nulle part : trois avis
-- existent, aucune note n'est renseignée.
CREATE OR REPLACE FUNCTION public.trg_refresh_driver_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_id uuid := coalesce(NEW.delivery_person_id, OLD.delivery_person_id);
begin
  update delivery_persons dp
     set rating = s.avg_rating, total_reviews = s.n
    from (select round(avg(rating)::numeric, 1) avg_rating, count(*)::int n
            from delivery_person_reviews where delivery_person_id = v_id) s
   where dp.id = v_id;
  return null;
end;
$function$;

DROP TRIGGER IF EXISTS refresh_driver_rating ON public.delivery_person_reviews;
CREATE TRIGGER refresh_driver_rating
  AFTER INSERT OR UPDATE OF rating OR DELETE ON public.delivery_person_reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_driver_rating();

CREATE OR REPLACE FUNCTION public.trg_refresh_seller_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_id uuid := coalesce(NEW.reviewed_id, OLD.reviewed_id);
begin
  update users u
     set rating = (select round(avg(rating)::numeric, 1) from reviews where reviewed_id = v_id)
   where u.id = v_id;
  return null;
end;
$function$;

DROP TRIGGER IF EXISTS refresh_seller_rating ON public.reviews;
CREATE TRIGGER refresh_seller_rating
  AFTER INSERT OR UPDATE OF rating OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_seller_rating();

-- Rattrapage des notes existantes.
UPDATE public.users u
   SET rating = s.avg_rating
  FROM (SELECT reviewed_id, round(avg(rating)::numeric, 1) avg_rating
          FROM public.reviews GROUP BY reviewed_id) s
 WHERE u.id = s.reviewed_id;

UPDATE public.delivery_persons dp
   SET rating = s.avg_rating, total_reviews = s.n
  FROM (SELECT delivery_person_id, round(avg(rating)::numeric, 1) avg_rating, count(*)::int n
          FROM public.delivery_person_reviews GROUP BY delivery_person_id) s
 WHERE dp.id = s.delivery_person_id;


-- ── 3. Alerte admin « nouvelle commande » ───────────────────────────────────
-- `pickup_point` (valeur canonique) s'affichait brut ; la « Commission »
-- mélangeait frais acheteur et commission vendeur selon le mode de paiement.
CREATE OR REPLACE FUNCTION public.trg_alert_new_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_vendeur text; v_tel_v text; v_acheteur text; v_tel_a text; v_article text;
BEGIN
  SELECT COALESCE(NULLIF(shop_name,''), full_name), phone INTO v_vendeur, v_tel_v
    FROM users WHERE id = NEW.seller_id;
  SELECT COALESCE(full_name,'(acheteur)'), phone INTO v_acheteur, v_tel_a
    FROM users WHERE id = NEW.buyer_id;
  SELECT title INTO v_article FROM listings WHERE id = NEW.listing_id;

  PERFORM fn_alert_admin(
    '🎉 COMMANDE — ' || COALESCE(NEW.total_amount,0)::text || ' FCFA',
    '**' || COALESCE(v_article,'(article)') || '**' ||
    CASE WHEN COALESCE(NEW.quantity,1) > 1 THEN '  ×' || NEW.quantity ELSE '' END ||
    COALESCE(E'\n' || NEW.variant_label, ''),
    5793266,
    jsonb_build_array(
      jsonb_build_object('name','🏪 Vendeur','value',
        COALESCE(v_vendeur,'?') || E'\n' || COALESCE(v_tel_v,'pas de numéro'),'inline',true),
      jsonb_build_object('name','🛒 Acheteur','value',
        COALESCE(v_acheteur,'?') || E'\n' || COALESCE(v_tel_a,'pas de numéro'),'inline',true),
      jsonb_build_object('name','Paiement','value',
        CASE NEW.payment_method WHEN 'online' THEN 'En ligne (séquestre)'
                                WHEN 'cod' THEN 'À la livraison'
                                WHEN 'cash_at_shop' THEN 'En boutique'
                                ELSE COALESCE(NEW.payment_method,'?') END,'inline',true),
      jsonb_build_object('name','Réception','value',
        CASE NEW.delivery_mode WHEN 'pickup' THEN 'Retrait en boutique'
                               WHEN 'pickup_point' THEN 'Retrait en boutique'
                               WHEN 'delivery' THEN 'Livraison à domicile'
                               ELSE COALESCE(NEW.delivery_mode,'?') END,'inline',true),
      jsonb_build_object('name','Détail','value',
        'Article ' || COALESCE(NEW.product_amount,0) || ' · Livraison ' || COALESCE(NEW.delivery_fee,0)
        || ' · Frais acheteur ' || COALESCE(NEW.reserve_fee,0)
        || ' · Commission vendeur ' || COALESCE(NEW.platform_commission,0) || ' FCFA','inline',false),
      jsonb_build_object('name','📍 Adresse','value',COALESCE(NEW.delivery_address,'—'),'inline',false)
    ),
    'https://daloamarket.com/suivi/' || NEW.id
  );
  RETURN NULL;
END; $function$;
