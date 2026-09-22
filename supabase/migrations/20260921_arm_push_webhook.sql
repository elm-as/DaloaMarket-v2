-- ============================================================================
-- ACTIVATION du relais /push/webhook — à exécuter une seule fois
--
-- Prérequis : 20260921_push_webhook_triggers.sql déjà appliqué.
--
-- Remplacer <<<VALEUR_DE_PUSH_WEBHOOK_SECRET>>> par la valeur exacte de la
-- variable d'environnement `PUSH_WEBHOOK_SECRET` du serveur Railway (vérifié le
-- 21/09/2026 : elle y est bien définie, le webhook répond 403 sur mauvais
-- secret). Toute autre valeur donnera un 403 silencieux côté base.
--
-- Les deux opérations sont dans la même transaction : l'ancien chemin Expo est
-- retiré au moment précis où le nouveau devient actif, sans fenêtre de silence
-- ni de double notification.
-- ============================================================================

BEGIN;

INSERT INTO public.app_config (key, value)
VALUES ('push_webhook_secret', '<<<VALEUR_DE_PUSH_WEBHOOK_SECRET>>>')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Optionnel : seulement si le serveur push n'est pas sur le même hôte que
-- `payout_api_url` (sinon cette ligne est inutile, le repli suffit).
-- INSERT INTO public.app_config (key, value) VALUES ('push_api_url', 'https://api.daloamarket.com')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Le webhook couvre désormais « course disponible » pour mobile ET web :
-- les déclencheurs Expo directs feraient double emploi.
DROP TRIGGER IF EXISTS notify_drivers_run_available_ins ON public.delivery_assignments;
DROP TRIGGER IF EXISTS notify_drivers_run_available_upd ON public.delivery_assignments;

COMMIT;

-- Vérification après coup (les envois passent par pg_net, en asynchrone) :
--   select id, status_code, content_type, created
--     from net._http_response order by created desc limit 10;
