-- ============================================================================
-- Lot 7 : notifications de chat émises par la base
--
-- Les applis envoyaient elles-mêmes la notification d'un nouveau message, via
-- deux points d'entrée ouverts à tout utilisateur connecté (Railway
-- /push/notify-user et la fonction Edge send-push) qui acceptaient un titre et
-- un texte libres, vers n'importe quel destinataire (send-push : une liste sans
-- limite). N'importe qui pouvait donc envoyer une fausse notification à tous.
--
-- Le webhook Railway sait déjà construire la notification d'un message à partir
-- de la base (expéditeur, annonce, texte censuré) : il suffit de l'appeler à
-- l'insertion. Les points d'entrée manuels sont réservés à l'administration.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_push_webhook_messages()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  PERFORM fn_notify_push_webhook('INSERT', 'messages', to_jsonb(NEW), NULL);
  RETURN NULL;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.trg_push_webhook_messages() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS push_webhook_messages ON public.messages;
CREATE TRIGGER push_webhook_messages
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_push_webhook_messages();
