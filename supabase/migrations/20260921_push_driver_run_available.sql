-- ============================================================================
-- Push « nouvelle course disponible » pour les livreurs
--
-- Contexte : jusqu'ici aucun déclencheur n'envoyait de notification quand une
-- course devenait disponible. Le livreur ne la découvrait que par le sondage
-- de l'application toutes les 6 s — donc uniquement écran allumé, app ouverte.
--
-- Choix d'implémentation : l'envoi part de la base via `pg_net` directement vers
-- l'API Expo, et non via l'Edge Function `send-push`. Raison : l'Edge Function
-- exige un jeton (service_role ou JWT utilisateur) qu'il faudrait stocker en
-- base pour l'appeler depuis un trigger. Ici le déclenchement est atomique avec
-- le changement de statut et n'a aucun secret à garder.
-- ============================================================================

-- 1. Helper générique d'envoi Expo (lots de 100, limite de l'API Expo)
CREATE OR REPLACE FUNCTION public.fn_push_expo(
  p_tokens  text[],
  p_title   text,
  p_body    text,
  p_data    jsonb DEFAULT '{}'::jsonb,
  p_channel text DEFAULT 'default',
  p_sound   text DEFAULT 'default'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total    int;
  v_offset   int := 0;
  v_batch    text[];
  v_messages jsonb;
  v_sent     int := 0;
BEGIN
  v_total := COALESCE(array_length(p_tokens, 1), 0);
  IF v_total = 0 THEN
    RETURN 0;
  END IF;

  WHILE v_offset < v_total LOOP
    v_batch := p_tokens[(v_offset + 1):(v_offset + 100)];

    SELECT jsonb_agg(
             jsonb_build_object(
               'to', t,
               'title', p_title,
               'body', p_body,
               'data', COALESCE(p_data, '{}'::jsonb),
               'sound', p_sound,
               'channelId', p_channel,
               'priority', 'high'
             )
           )
      INTO v_messages
      FROM unnest(v_batch) AS t;

    PERFORM net.http_post(
      url     := 'https://exp.host/--/api/v2/push/send',
      body    := v_messages,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Accept', 'application/json'
      )
    );

    v_sent   := v_sent + COALESCE(array_length(v_batch, 1), 0);
    v_offset := v_offset + 100;
  END LOOP;

  RETURN v_sent;
END;
$$;

COMMENT ON FUNCTION public.fn_push_expo IS
  'Envoie une notification Expo à une liste de jetons, par lots de 100, via pg_net.';


-- 2. Déclencheur : course devenue disponible → push à tous les livreurs en ligne
--
-- Destinataires : les livreurs (`delivery_persons`) marqués « en ligne »
-- (`is_available = true`) qui ont un jeton Expo actif pour l'app delivery.
-- Pas de filtre sur la vérification du livreur : `accept_delivery_assignment`
-- n'en exige aucune, donc filtrer ici rendrait muettes des courses que le
-- livreur peut réellement accepter. Un livreur qui s'est mis hors ligne
-- (ou déconnecté, qui force `is_available = false`) n'est pas réveillé.
CREATE OR REPLACE FUNCTION public.trg_notify_drivers_run_available()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tokens  text[];
  v_price   int;
  v_pickup  text;
  v_dropoff text;
  v_body    text;
BEGIN
  SELECT array_agg(DISTINCT ps.expo_push_token)
    INTO v_tokens
    FROM push_subscriptions ps
    JOIN delivery_persons dp ON dp.user_id = ps.user_id
   WHERE ps.is_active = true
     AND ps.app_type = 'delivery'
     AND ps.expo_push_token IS NOT NULL
     AND (ps.expo_push_token LIKE 'ExponentPushToken%' OR ps.expo_push_token LIKE 'ExpoPushToken%')
     AND dp.is_available = true;

  IF v_tokens IS NULL OR array_length(v_tokens, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  v_price   := COALESCE(NEW.delivery_price, 0)::int;
  v_pickup  := NULLIF(split_part(COALESCE(NEW.pickup_location, ''), '(', 2), '');
  v_pickup  := COALESCE(NULLIF(rtrim(v_pickup, ')'), ''), NULLIF(NEW.pickup_location, ''), 'Daloa');
  v_dropoff := COALESCE(NULLIF(NEW.dropoff_location, ''), 'Client');

  v_body := 'Retrait : ' || v_pickup || E'\n' ||
            'Dépôt : ' || v_dropoff ||
            CASE WHEN v_price > 0 THEN ' · ' || v_price::text || ' FCFA' ELSE '' END;

  PERFORM fn_push_expo(
    v_tokens,
    '🛵 Nouvelle course disponible',
    v_body,
    -- Pas d'`assignmentId` dans les données : le client ouvre alors `/run/:id`,
    -- l'écran d'une course déjà attribuée. Ici la course est encore à prendre,
    -- donc le tap doit mener à la file des offres (`tag = run-available`).
    jsonb_build_object(
      'type', 'DRIVER_RUN_AVAILABLE',
      'tag', 'run-available',
      'orderId', NEW.order_id
    ),
    'default'
  );

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.trg_notify_drivers_run_available IS
  'Notifie les livreurs en ligne dès qu''une course passe en awaiting_pickup sans livreur.';

DROP TRIGGER IF EXISTS notify_drivers_run_available_ins ON public.delivery_assignments;
DROP TRIGGER IF EXISTS notify_drivers_run_available_upd ON public.delivery_assignments;

-- INSERT : course créée déjà disponible (confirm_seller_availability crée
-- parfois directement l'assignment en awaiting_pickup).
CREATE TRIGGER notify_drivers_run_available_ins
AFTER INSERT ON public.delivery_assignments
FOR EACH ROW
WHEN (NEW.status = 'awaiting_pickup' AND NEW.delivery_person_id IS NULL)
EXECUTE FUNCTION public.trg_notify_drivers_run_available();

-- UPDATE : cas nominal, le vendeur confirme la disponibilité de l'article
-- (pending_seller_confirmation → awaiting_pickup). La condition sur OLD.status
-- évite de renotifier à chaque UPDATE d'une course déjà diffusée.
CREATE TRIGGER notify_drivers_run_available_upd
AFTER UPDATE ON public.delivery_assignments
FOR EACH ROW
WHEN (
  NEW.status = 'awaiting_pickup'
  AND NEW.delivery_person_id IS NULL
  AND OLD.status IS DISTINCT FROM 'awaiting_pickup'
)
EXECUTE FUNCTION public.trg_notify_drivers_run_available();

-- 3. Fermeture de l'API REST sur ces deux fonctions
--
-- PostgREST expose toute fonction `public` en RPC. Sans ce REVOKE, un visiteur
-- non connecté (rôle `anon`) peut appeler /rest/v1/rpc/fn_push_expo et pousser
-- le titre et le texte de son choix vers n'importe quel jeton Expo.
-- Les triggers ne sont pas concernés : ils s'exécutent sous le propriétaire.
REVOKE ALL ON FUNCTION public.fn_push_expo(text[], text, text, jsonb, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_notify_drivers_run_available() FROM PUBLIC, anon, authenticated;
