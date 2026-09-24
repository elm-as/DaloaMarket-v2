-- ============================================================================
-- Lot 3 de l'audit du 24/09/2026 : tables manquantes et droits d'accès
--
-- Trois fichiers de migration n'avaient jamais été appliqués
-- (20260809_feature_seasons_and_hall_of_fame, 20260922_admin_financial_audit_logs,
-- 20260922_2_fix_driver_payout_flows). Ils ne sont PAS rejoués tels quels :
--  * le premier ouvrait feature_seasons en écriture à tout le monde ;
--  * les deux autres remplaçaient resolve_delivery_dispute et
--    create_delivery_payout par des versions antérieures au durcissement du
--    03/09 (et create_delivery_payout changeait de type de retour).
-- Seuls les objets manquants sont créés ici, avec des droits fermés.
-- ============================================================================


-- ── 1. Journal d'audit financier ────────────────────────────────────────────
-- Railway (routes/payouts.js) y écrit en service_role ; l'onglet Versements de
-- l'admin web le lit. La table n'existait pas : chaque écriture échouait.
CREATE TABLE IF NOT EXISTS public.admin_financial_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  target_id text,
  target_type text,
  amount integer,
  currency text NOT NULL DEFAULT 'XOF',
  recipient_phone text,
  recipient_name text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_audit_admin_id ON public.admin_financial_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_action_type ON public.admin_financial_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_financial_audit_created_at ON public.admin_financial_audit_logs(created_at DESC);

ALTER TABLE public.admin_financial_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view financial audit logs" ON public.admin_financial_audit_logs;
CREATE POLICY "Admins can view financial audit logs"
  ON public.admin_financial_audit_logs FOR SELECT TO authenticated
  USING (public.is_admin_or_service_role());

DROP POLICY IF EXISTS "Admins can insert financial audit logs" ON public.admin_financial_audit_logs;
CREATE POLICY "Admins can insert financial audit logs"
  ON public.admin_financial_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_service_role() AND admin_id = auth.uid());


-- ── 2. Versements visibles par l'administration ─────────────────────────────
-- payouts n'avait qu'une politique « ses propres versements » : l'onglet
-- Versements de l'admin (lecture directe de la table) restait vide.
DROP POLICY IF EXISTS payouts_select_admin ON public.payouts;
CREATE POLICY payouts_select_admin
  ON public.payouts FOR SELECT TO authenticated
  USING (public.is_admin_or_service_role());


-- ── 3. Versement livreur déclenché par l'admin ──────────────────────────────
-- L'admin web appelait cette RPC, absente, puis retombait sur un INSERT direct
-- dans payouts, refusé (aucune politique d'insertion). Le bouton échouait
-- toujours. On délègue à create_delivery_payout, qui porte déjà toutes les
-- garanties (commande livrée, séquestre financé, 90 % des frais, réseau
-- Mobile Money choisi par le livreur, idempotence).
CREATE OR REPLACE FUNCTION public.admin_trigger_driver_payout(p_assignment_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_assign    record;
  v_escrow_id uuid;
  v_payout_id uuid;
begin
  if not is_admin_or_service_role() then
    return json_build_object('success', false, 'reason', 'unauthorized');
  end if;

  select * into v_assign from delivery_assignments where id = p_assignment_id;
  if not found then
    return json_build_object('success', false, 'reason', 'assignment_not_found');
  end if;

  if v_assign.delivery_person_id is null then
    return json_build_object('success', false, 'reason', 'no_driver');
  end if;

  select id into v_escrow_id from escrow_transactions where order_id = v_assign.order_id limit 1;
  if v_escrow_id is null then
    -- Paiement en espèces : le livreur est payé à la remise, rien à verser.
    return json_build_object('success', false, 'reason', 'no_escrow');
  end if;

  perform create_delivery_payout(v_assign.order_id, v_escrow_id, v_assign.delivery_person_id, 0);

  select id into v_payout_id from payouts
   where idempotency_key = 'payout_' || v_assign.order_id || '_delivery';

  if v_payout_id is null then
    -- create_delivery_payout refuse : commande non livrée, séquestre non
    -- financé, frais nuls ou livreur sans numéro de versement.
    return json_build_object('success', false, 'reason', 'not_eligible');
  end if;

  update payouts
     set status = 'pending', scheduled_for = now()
   where id = v_payout_id and status = 'failed';

  return json_build_object('success', true, 'payout_id', v_payout_id);
end;
$function$;

REVOKE ALL ON FUNCTION public.admin_trigger_driver_payout(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_trigger_driver_payout(uuid) TO authenticated;


-- ── 4. Saisons et Hall of Fame des idées ────────────────────────────────────
ALTER TABLE public.feature_suggestions
  ADD COLUMN IF NOT EXISTS season_id uuid,
  ADD COLUMN IF NOT EXISTS season_name text DEFAULT 'Saison 1',
  ADD COLUMN IF NOT EXISTS author_name text DEFAULT 'Membre DaloaMarket',
  ADD COLUMN IF NOT EXISTS is_hall_of_fame boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.feature_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number int NOT NULL DEFAULT 1,
  season_name text NOT NULL DEFAULT 'Saison 1',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  winner_feature_id uuid REFERENCES public.feature_suggestions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_seasons_status ON public.feature_seasons(status);
CREATE INDEX IF NOT EXISTS idx_feature_suggestions_hall_of_fame ON public.feature_suggestions(is_hall_of_fame);

ALTER TABLE public.feature_seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read feature_seasons" ON public.feature_seasons;
CREATE POLICY "Public read feature_seasons" ON public.feature_seasons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage feature_seasons" ON public.feature_seasons;
CREATE POLICY "Admins manage feature_seasons" ON public.feature_seasons FOR ALL TO authenticated
  USING (public.is_admin_or_service_role())
  WITH CHECK (public.is_admin_or_service_role());


-- ── 5. Idées et votes : fin de l'écriture libre ─────────────────────────────
-- N'importe qui, même non connecté, pouvait modifier toute idée (titre,
-- statut, compteur) et supprimer les votes des autres. Le vote passe par une
-- RPC ; la modération est réservée à l'administration. La suppression, qui
-- n'avait aucune politique, est ouverte à l'admin (le bouton affichait
-- « supprimée » sans rien supprimer).
DROP POLICY IF EXISTS "Public update feature_suggestions" ON public.feature_suggestions;
DROP POLICY IF EXISTS "Admins update feature_suggestions" ON public.feature_suggestions;
CREATE POLICY "Admins update feature_suggestions" ON public.feature_suggestions FOR UPDATE TO authenticated
  USING (public.is_admin_or_service_role())
  WITH CHECK (public.is_admin_or_service_role());

DROP POLICY IF EXISTS "Admins delete feature_suggestions" ON public.feature_suggestions;
CREATE POLICY "Admins delete feature_suggestions" ON public.feature_suggestions FOR DELETE TO authenticated
  USING (public.is_admin_or_service_role());

DROP POLICY IF EXISTS "Public delete feature_upvotes" ON public.feature_upvotes;
DROP POLICY IF EXISTS "Public insert feature_upvotes" ON public.feature_upvotes;

-- Une idée proposée publiquement part toujours de zéro : ni votes gonflés,
-- ni statut ou Hall of Fame choisis par l'auteur.
CREATE OR REPLACE FUNCTION public.trg_sanitize_feature_suggestion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF public.is_admin_or_service_role() THEN
    RETURN NEW;
  END IF;
  NEW.upvotes_count   := 1;
  NEW.status          := 'under_review';
  NEW.is_hall_of_fame := false;
  NEW.admin_notes     := NULL;
  NEW.completed_at    := NULL;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sanitize_feature_suggestion ON public.feature_suggestions;
CREATE TRIGGER sanitize_feature_suggestion
  BEFORE INSERT ON public.feature_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.trg_sanitize_feature_suggestion();

-- Le vote de l'auteur, que le tuto insérait lui-même (insertion désormais
-- fermée), est posé par la base : le compteur 1 correspond à une vraie ligne.
CREATE OR REPLACE FUNCTION public.trg_feature_author_upvote()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF coalesce(trim(NEW.created_by_ip), '') <> '' THEN
    INSERT INTO public.feature_upvotes (feature_id, user_ip) VALUES (NEW.id, left(trim(NEW.created_by_ip), 64));
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS feature_author_upvote ON public.feature_suggestions;
CREATE TRIGGER feature_author_upvote
  AFTER INSERT ON public.feature_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.trg_feature_author_upvote();

-- Vote : bascule le vote de cette IP et recalcule le compteur depuis la table
-- des votes (plus de compteur écrit par le navigateur).
CREATE OR REPLACE FUNCTION public.toggle_feature_upvote(p_feature_id uuid, p_user_ip text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_ip    text := left(trim(coalesce(p_user_ip, '')), 64);
  v_voted boolean;
  v_count integer;
begin
  if v_ip = '' then
    return json_build_object('success', false, 'reason', 'ip_required');
  end if;

  if not exists (select 1 from feature_suggestions where id = p_feature_id) then
    return json_build_object('success', false, 'reason', 'feature_not_found');
  end if;

  delete from feature_upvotes where feature_id = p_feature_id and user_ip = v_ip;
  if found then
    v_voted := false;
  else
    insert into feature_upvotes (feature_id, user_ip) values (p_feature_id, v_ip);
    v_voted := true;
  end if;

  select count(*) into v_count from feature_upvotes where feature_id = p_feature_id;
  update feature_suggestions set upvotes_count = v_count, updated_at = now() where id = p_feature_id;

  return json_build_object('success', true, 'voted', v_voted, 'upvotes_count', v_count);
end;
$function$;

REVOKE ALL ON FUNCTION public.toggle_feature_upvote(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_feature_upvote(uuid, text) TO anon, authenticated;
