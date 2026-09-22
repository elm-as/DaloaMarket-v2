-- ============================================================================
-- Câblage de /push/webhook depuis la base
--
-- Le serveur Railway expose déjà `/push/webhook`, qui couvre le chat, les
-- statuts de commande et les courses, et qui envoie **à la fois** en Expo
-- (mobile) et en Web Push (navigateur). Rien ne l'appelait : l'infrastructure
-- était écrite mais morte. Ces déclencheurs l'appellent.
--
-- Même mécanique que `fn_process_payouts` : l'URL et le secret sont lus dans
-- `app_config`. Tant que `push_webhook_secret` est absent, les fonctions sont
-- inertes — aucun appel réseau, aucune erreur. L'activation se fait avec
-- 20260921_arm_push_webhook.sql, qui pose le secret ET retire les déclencheurs
-- Expo de 20260921_push_driver_run_available.sql (sinon double notification).
-- ============================================================================

-- 1. Appel générique du webhook, au format attendu par le serveur
--    ({ type, table, record, old_record }).
CREATE OR REPLACE FUNCTION public.fn_notify_push_webhook(
  p_type   text,
  p_table  text,
  p_record jsonb,
  p_old    jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_url    text;
  v_secret text;
BEGIN
  SELECT value INTO v_secret FROM app_config WHERE key = 'push_webhook_secret';
  IF v_secret IS NULL OR v_secret = '' THEN
    RETURN;
  END IF;

  SELECT value INTO v_url FROM app_config WHERE key = 'push_api_url';
  IF v_url IS NULL OR v_url = '' THEN
    -- Même hôte que les virements : le serveur Railway est unique.
    SELECT value INTO v_url FROM app_config WHERE key = 'payout_api_url';
  END IF;
  IF v_url IS NULL OR v_url = '' THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := rtrim(v_url, '/') || '/push/webhook',
    body    := jsonb_build_object(
      'type', p_type,
      'table', p_table,
      'record', p_record,
      'old_record', p_old
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-webhook-secret', v_secret
    )
  );
END;
$fn$;

COMMENT ON FUNCTION public.fn_notify_push_webhook IS
  'Relaie un changement de ligne vers /push/webhook (Railway). Inerte tant que app_config.push_webhook_secret est absent.';


-- 2. Courses : création, diffusion, prise en charge, livraison.
CREATE OR REPLACE FUNCTION public.trg_push_webhook_delivery_assignments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM fn_notify_push_webhook('INSERT', 'delivery_assignments', to_jsonb(NEW), NULL);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Seul le changement de statut porte une notification : sans ce filtre,
    -- chaque écriture de position ou de photo rappellerait le webhook.
    PERFORM fn_notify_push_webhook('UPDATE', 'delivery_assignments', to_jsonb(NEW), to_jsonb(OLD));
  END IF;
  RETURN NULL;
END;
$fn$;


-- 3. Commandes : uniquement les changements de statut.
--    Les commandes payées en ligne sont créées directement en 'paid' par le
--    serveur (createOrderFromEscrow), qui notifie déjà le vendeur : aucun
--    doublon à craindre ici, ce déclencheur ne voit que les UPDATE.
CREATE OR REPLACE FUNCTION public.trg_push_webhook_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM fn_notify_push_webhook('UPDATE', 'orders', to_jsonb(NEW), to_jsonb(OLD));
  END IF;
  RETURN NULL;
END;
$fn$;


DROP TRIGGER IF EXISTS push_webhook_delivery_assignments ON public.delivery_assignments;
CREATE TRIGGER push_webhook_delivery_assignments
AFTER INSERT OR UPDATE ON public.delivery_assignments
FOR EACH ROW
EXECUTE FUNCTION public.trg_push_webhook_delivery_assignments();

DROP TRIGGER IF EXISTS push_webhook_orders ON public.orders;
CREATE TRIGGER push_webhook_orders
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_push_webhook_orders();


-- 4. PostgREST expose toute fonction publique en RPC : sans ce REVOKE,
--    n'importe qui peut faire relayer un faux événement au webhook.
REVOKE ALL ON FUNCTION public.fn_notify_push_webhook(text, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_push_webhook_delivery_assignments() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_push_webhook_orders() FROM PUBLIC, anon, authenticated;

-- Note : le chat (`messages`) n'est volontairement pas câblé ici. L'écran de
-- discussion mobile envoie déjà le push côté client
-- (apps/daloamarket/app/chat/[id].tsx) : brancher le webhook en plus
-- produirait deux notifications pour un message. À traiter en retirant d'abord
-- l'envoi côté client.
