-- ============================================================================
-- Migration: F02 — Indice Anti-Lapin & Fiabilité Acheteur (Cash on Delivery)
-- Date: 2026-10-22
-- Objectifs :
-- 1. Ajouter les métriques de fiabilité COD sur public.users.
-- 2. Créer la table public.cod_delivery_incidents pour consigner les refus/lapins.
-- 3. Mettre à jour automatiquement les statistiques lors d'une livraison COD réussie.
-- 4. Créer la RPC report_cod_delivery_refusal (appelable par livreur ou vendeur).
-- 5. Protéger create_cod_order contre les acheteurs temporairement suspendus.
-- 6. Créer la RPC d'administration reset_buyer_cod_penalties.
-- ============================================================================

-- 1. Colonnes de suivi Anti-Lapin sur public.users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS cod_orders_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cod_delivered_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cod_refused_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cod_reliability_score numeric NOT NULL DEFAULT 100.0,
  ADD COLUMN IF NOT EXISTS cod_warning_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cod_blocked_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_cod_refusal_at timestamptz;

COMMENT ON COLUMN public.users.cod_orders_count IS
  'Nombre total de commandes avec paiement à la livraison (COD) passées par l''acheteur.';
COMMENT ON COLUMN public.users.cod_delivered_count IS
  'Nombre total de commandes COD réceptionnées et payées avec succès.';
COMMENT ON COLUMN public.users.cod_refused_count IS
  'Nombre de livraisons COD refusées au pas de la porte ou client injoignable (lapins).';
COMMENT ON COLUMN public.users.cod_reliability_score IS
  'Score de fiabilité COD en pourcentage (100.0 par défaut, décroît en cas de refus).';
COMMENT ON COLUMN public.users.cod_warning_count IS
  'Nombre d''avertissements formels Anti-Lapin reçus par l''acheteur.';
COMMENT ON COLUMN public.users.cod_blocked_until IS
  'Date jusqu''à laquelle l''option Paiement à la livraison est suspendue pour cet acheteur.';
COMMENT ON COLUMN public.users.last_cod_refusal_at IS
  'Date et heure du dernier refus ou non-réception enregistré.';

-- 2. Table des incidents de livraison COD
CREATE TABLE IF NOT EXISTS public.cod_delivery_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  delivery_person_id uuid REFERENCES public.delivery_persons(id) ON DELETE SET NULL,
  reporter_id uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  refusal_reason text NOT NULL,
  notes text,
  proof_photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cod_delivery_incidents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cod_incidents_buyer
  ON public.cod_delivery_incidents(buyer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cod_incidents_order
  ON public.cod_delivery_incidents(order_id);

-- RLS sur cod_delivery_incidents
DROP POLICY IF EXISTS cod_incidents_select_parties ON public.cod_delivery_incidents;
CREATE POLICY cod_incidents_select_parties ON public.cod_delivery_incidents
  FOR SELECT TO authenticated
  USING (
    buyer_id = auth.uid()
    OR seller_id = auth.uid()
    OR reporter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.delivery_persons dp
       WHERE dp.user_id = auth.uid()
         AND dp.id = cod_delivery_incidents.delivery_person_id
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
       WHERE u.id = auth.uid()
         AND LOWER(u.role) IN ('admin', 'superadmin', 'moderator')
    )
  );

-- 3. Mise à jour des stats acheteur lors d'une livraison réussie
CREATE OR REPLACE FUNCTION public.fn_update_buyer_cod_stats_on_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_is_cod boolean;
  v_buyer_id uuid;
BEGIN
  -- Détecte si la commande passe à delivered ou completed
  IF NEW.status IN ('delivered', 'completed')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('delivered', 'completed')) THEN

    v_is_cod := COALESCE(NEW.payment_method, '') IN ('cod', 'cash', 'cash_at_shop');
    v_buyer_id := NEW.buyer_id;

    IF v_is_cod AND v_buyer_id IS NOT NULL THEN
      UPDATE public.users
      SET
        cod_delivered_count = cod_delivered_count + 1,
        cod_orders_count = GREATEST(cod_orders_count, cod_delivered_count + 1 + cod_refused_count),
        cod_reliability_score = ROUND(
          ((cod_delivered_count + 1)::numeric / GREATEST(1, cod_delivered_count + 1 + cod_refused_count)) * 100.0,
          1
        ),
        -- Si l'acheteur avait une suspension expirée ou 1 seul refus, une livraison réussie réhabilite
        cod_blocked_until = CASE
          WHEN cod_blocked_until IS NOT NULL AND cod_blocked_until <= now() THEN NULL
          ELSE cod_blocked_until
        END
      WHERE id = v_buyer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_buyer_cod_stats ON public.orders;
CREATE TRIGGER trg_update_buyer_cod_stats
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_buyer_cod_stats_on_delivered();

-- 4. RPC report_cod_delivery_refusal (Signaler un refus / lapin)
CREATE OR REPLACE FUNCTION public.report_cod_delivery_refusal(
  p_order_id uuid,
  p_reason text,
  p_notes text DEFAULT NULL,
  p_proof_photo_url text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_order record;
  v_assignment record;
  v_dp_id uuid;
  v_is_authorized boolean := false;
  v_new_refused_count integer;
  v_new_delivered_count integer;
  v_new_score numeric;
  v_blocked_until timestamptz := NULL;
  v_is_blocked boolean := false;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  -- Récupérer la commande
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'order_not_found');
  END IF;

  -- Vérifier que la commande est en COD / Espèces
  IF COALESCE(v_order.payment_method, '') NOT IN ('cod', 'cash', 'cash_at_shop') THEN
    RETURN json_build_object('success', false, 'reason', 'not_a_cod_order',
      'message', 'Cette action ne s''applique qu''aux commandes payées à la livraison.');
  END IF;

  -- Vérifier le statut de la commande
  IF v_order.status IN ('delivered', 'completed', 'cancelled') THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_status',
      'message', 'Cette commande est déjà clôturée ou livrée.');
  END IF;

  -- Course associée
  SELECT * INTO v_assignment FROM public.delivery_assignments WHERE order_id = p_order_id LIMIT 1;
  IF FOUND AND v_assignment.delivery_person_id IS NOT NULL THEN
    SELECT id INTO v_dp_id FROM public.delivery_persons
     WHERE id = v_assignment.delivery_person_id AND user_id = v_caller_id;
  END IF;

  -- Vérifier l'autorisation : vendeur, livreur assigné ou admin
  IF v_order.seller_id = v_caller_id THEN
    v_is_authorized := true;
  ELSIF v_dp_id IS NOT NULL THEN
    v_is_authorized := true;
  ELSIF EXISTS (
    SELECT 1 FROM public.users WHERE id = v_caller_id AND LOWER(role) IN ('admin', 'superadmin', 'moderator')
  ) THEN
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized',
      'message', 'Seul le livreur assigné ou le vendeur peut signaler un refus de livraison.');
  END IF;

  -- Enregistrer l'incident
  INSERT INTO public.cod_delivery_incidents (
    order_id,
    buyer_id,
    seller_id,
    delivery_person_id,
    reporter_id,
    refusal_reason,
    notes,
    proof_photo_url
  ) VALUES (
    p_order_id,
    v_order.buyer_id,
    v_order.seller_id,
    v_assignment.delivery_person_id,
    v_caller_id,
    p_reason,
    p_notes,
    p_proof_photo_url
  );

  -- Mettre à jour la commande
  UPDATE public.orders
     SET status = 'cancelled',
         cancel_reason = 'cod_refusal:' || p_reason,
         updated_at = now()
   WHERE id = p_order_id;

  -- Mettre à jour la course de livraison si existante
  IF v_assignment.id IS NOT NULL THEN
    UPDATE public.delivery_assignments
       SET status = 'cancelled',
           cancel_reason = p_reason,
           updated_at = now()
     WHERE id = v_assignment.id;
  END IF;

  -- Calculer les nouvelles métriques de l'acheteur
  SELECT cod_delivered_count, cod_refused_count
    INTO v_new_delivered_count, v_new_refused_count
    FROM public.users
   WHERE id = v_order.buyer_id;

  v_new_refused_count := COALESCE(v_new_refused_count, 0) + 1;
  v_new_delivered_count := COALESCE(v_new_delivered_count, 0);
  v_new_score := ROUND((v_new_delivered_count::numeric / GREATEST(1, v_new_delivered_count + v_new_refused_count)) * 100.0, 1);

  -- Règle Anti-Lapin :
  -- 1er refus : Avertissement formel
  -- 2e refus et plus (ou score < 70%) : Suspension du mode COD pendant 14 jours
  IF v_new_refused_count >= 2 OR (v_new_score < 70.0 AND v_new_refused_count >= 1) THEN
    v_blocked_until := now() + interval '14 days';
    v_is_blocked := true;
  END IF;

  UPDATE public.users
     SET cod_refused_count = v_new_refused_count,
         cod_warning_count = cod_warning_count + 1,
         cod_reliability_score = v_new_score,
         last_cod_refusal_at = now(),
         cod_blocked_until = COALESCE(v_blocked_until, cod_blocked_until)
   WHERE id = v_order.buyer_id;

  RETURN json_build_object(
    'success', true,
    'message', CASE
      WHEN v_is_blocked THEN 'Incident enregistré. Le compte acheteur a été suspendu du paiement à la livraison pour récidive.'
      ELSE 'Incident enregistré. Un avertissement Anti-Lapin a été notifié à l''acheteur.'
    END,
    'new_refused_count', v_new_refused_count,
    'new_score', v_new_score,
    'is_blocked', v_is_blocked,
    'blocked_until', v_blocked_until
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_cod_delivery_refusal(uuid, text, text, text) TO authenticated;

-- 5. Mise à jour de create_cod_order pour bloquer les acheteurs sous sanction
-- (Remplacement chirurgical de la vérification de l'acheteur)
DO $$
DECLARE
  v_def text;
  v_new text;
  v_def := pg_get_functiondef('public.create_cod_order(jsonb,text,text,text,double precision,double precision,text,jsonb,uuid)'::regprocedure);

  -- Ajout du contrôle Anti-Lapin juste après la vérification v_buyer IS NULL
  IF v_def NOT LIKE '%cod_blocked_until%' THEN
    v_new := replace(
      v_def,
      E'  IF v_buyer IS NULL THEN\n    RETURN json_build_object(''success'', false, ''reason'', ''unauthenticated'');\n  END IF;',
      E'  IF v_buyer IS NULL THEN\n    RETURN json_build_object(''success'', false, ''reason'', ''unauthenticated'');\n  END IF;\n\n'
      || E'  -- Contrôle Anti-Lapin : Vérifier si l''acheteur est bloqué pour le paiement à la livraison\n'
      || E'  IF EXISTS (\n'
      || E'    SELECT 1 FROM public.users\n'
      || E'     WHERE id = v_buyer\n'
      || E'       AND cod_blocked_until IS NOT NULL\n'
      || E'       AND cod_blocked_until > now()\n'
      || E'  ) THEN\n'
      || E'    RETURN json_build_object(\n'
      || E'      ''success'', false,\n'
      || E'      ''reason'', ''cod_blocked'',\n'
      || E'      ''message'', ''Le paiement à la livraison est temporairement indisponible suite à des commandes non réceptionnées. Veuillez régler par Mobile Money sécurisé.''\n'
      || E'    );\n'
      || E'  END IF;'
    );

    IF v_new <> v_def THEN
      EXECUTE v_new;
    END IF;
  END IF;
END $$;

-- 6. RPC d'administration : réinitialiser les pénalités COD d'un acheteur
CREATE OR REPLACE FUNCTION public.reset_buyer_cod_penalties(
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
BEGIN
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users
     WHERE id = v_admin_id
       AND LOWER(role) IN ('admin', 'superadmin', 'moderator')
  ) THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized', 'message', 'Action réservée à la modération.');
  END IF;

  UPDATE public.users
     SET cod_blocked_until = NULL,
         cod_warning_count = 0,
         cod_refused_count = 0,
         cod_reliability_score = 100.0
   WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Pénalités Anti-Lapin levées pour cet acheteur.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_buyer_cod_penalties(uuid) TO authenticated;
