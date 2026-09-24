-- ============================================================================
-- Lot 8 : affiliations vendeur ↔ livreur
--
-- Les politiques permettaient à un vendeur :
--  * d'insérer directement une affiliation, sans passer par
--    invite_delivery_driver_by_phone qui vérifie le droit (Pro ou phase de
--    lancement) — le site web le faisait d'ailleurs en premier ;
--  * de modifier ses affiliations, donc de passer lui-même un livreur en
--    « active » sans son accord, et de lui réserver ses courses privées.
--
-- Désormais : l'invitation passe uniquement par la RPC (SECURITY DEFINER), le
-- vendeur peut seulement consulter et supprimer, et le livreur peut seulement
-- accepter ou refuser (statut), sans toucher aux autres colonnes.
-- ============================================================================
DROP POLICY IF EXISTS "Sellers can insert affiliations" ON public.seller_delivery_affiliations;
DROP POLICY IF EXISTS "Sellers can update their affiliations" ON public.seller_delivery_affiliations;

-- SECURITY INVOKER volontairement : current_user doit refléter l'appelant.
CREATE OR REPLACE FUNCTION public.trg_guard_affiliation_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- RPC SECURITY DEFINER (ré-invitation), service_role, migrations.
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin_or_service_role() THEN
    RETURN NEW;
  END IF;

  NEW.seller_id          := OLD.seller_id;
  NEW.delivery_person_id := OLD.delivery_person_id;
  NEW.created_at         := OLD.created_at;

  IF NEW.status NOT IN ('active', 'rejected') THEN
    RAISE EXCEPTION 'Un livreur peut seulement accepter ou refuser une invitation.';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.trg_guard_affiliation_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_affiliation_update ON public.seller_delivery_affiliations;
CREATE TRIGGER guard_affiliation_update
  BEFORE UPDATE ON public.seller_delivery_affiliations
  FOR EACH ROW EXECUTE FUNCTION public.trg_guard_affiliation_update();
