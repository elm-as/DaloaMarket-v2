-- ============================================================================
-- Migration : 20261107_driver_release_and_pickup_timeout.sql
-- Objectifs :
-- 1. Permettre à un livreur de se désister / libérer une course avant le ramassage
--    (`release_delivery_assignment`), la remettant en ligne (`awaiting_pickup`).
-- 2. Remettre automatiquement en ligne toute course acceptée depuis plus de 3h30
--    (210 minutes) sans que le colis ait été récupéré chez le vendeur
--    (`release_stale_accepted_assignments`), et planifier via pg_cron si présent.
-- ============================================================================

-- 1. RPC : Désistement / Libération manuelle d'une course par le livreur avant retrait
CREATE OR REPLACE FUNCTION public.release_delivery_assignment(
  p_assignment_id uuid,
  p_reason text DEFAULT 'driver_released'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_dp       uuid;
  v_assign   record;
  v_group_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'unauthenticated', 'message', 'Vous devez être connecté.');
  END IF;

  SELECT id INTO v_dp
    FROM public.delivery_persons
   WHERE user_id = auth.uid();

  IF v_dp IS NULL AND NOT is_admin_or_service_role() THEN
    RETURN json_build_object('success', false, 'reason', 'not_a_delivery_person', 'message', 'Profil livreur introuvable.');
  END IF;

  SELECT * INTO v_assign
    FROM public.delivery_assignments
   WHERE id = p_assignment_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'assignment_not_found', 'message', 'Course introuvable.');
  END IF;

  IF v_assign.delivery_person_id IS DISTINCT FROM v_dp AND NOT is_admin_or_service_role() THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized', 'message', 'Cette course ne vous est pas attribuée.');
  END IF;

  -- Une fois le colis récupéré (picked_up / in_transit), le livreur ne peut plus
  -- simplement remettre la course en ligne : il a la marchandise en main.
  IF v_assign.status <> 'accepted' THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'invalid_status',
      'current_status', v_assign.status,
      'message', 'Une course ne peut être libérée qu''avant le ramassage chez le vendeur.'
    );
  END IF;

  UPDATE public.delivery_assignments
     SET status = 'awaiting_pickup',
         delivery_person_id = NULL,
         accepted_at = NULL,
         pickup_otp_attempts = 0,
         updated_at = now()
   WHERE id = p_assignment_id
     AND status = 'accepted';

  v_group_id := NULLIF(to_jsonb(v_assign)->>'delivery_group_id', '')::uuid;
  IF v_group_id IS NOT NULL THEN
    EXECUTE
      'UPDATE public.delivery_assignments
          SET status = ''awaiting_pickup'', delivery_person_id = NULL, accepted_at = NULL, pickup_otp_attempts = 0, updated_at = now()
        WHERE delivery_group_id = $1 AND status = ''accepted'''
      USING v_group_id;

    IF to_regclass('public.delivery_group_runs') IS NOT NULL THEN
      EXECUTE
        'UPDATE public.delivery_group_runs SET status = ''awaiting_pickup'', delivery_person_id = NULL, updated_at = now() WHERE id = $1 AND status = ''accepted'''
        USING v_group_id;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'status', 'awaiting_pickup',
    'reason', COALESCE(NULLIF(trim(p_reason), ''), 'driver_released'),
    'message', 'La course a été remise en ligne pour les autres livreurs.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.release_delivery_assignment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_delivery_assignment(uuid, text) TO authenticated, service_role;


-- 2. RPC : Remise en ligne automatique des courses non récupérées après 3h30 (210 min)
CREATE OR REPLACE FUNCTION public.release_stale_accepted_assignments(
  p_timeout_minutes integer DEFAULT 210
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_cutoff        timestamptz := now() - make_interval(mins => GREATEST(60, COALESCE(p_timeout_minutes, 210)));
  v_released_ids  uuid[] := '{}';
  v_rec           record;
  v_group_id      uuid;
BEGIN
  FOR v_rec IN
    SELECT *
      FROM public.delivery_assignments
     WHERE status = 'accepted'
       AND COALESCE(accepted_at, updated_at, created_at) <= v_cutoff
     FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.delivery_assignments
       SET status = 'awaiting_pickup',
           delivery_person_id = NULL,
           accepted_at = NULL,
           pickup_otp_attempts = 0,
           updated_at = now()
     WHERE id = v_rec.id
       AND status = 'accepted';

    IF FOUND THEN
      v_released_ids := v_released_ids || v_rec.id;

      v_group_id := NULLIF(to_jsonb(v_rec)->>'delivery_group_id', '')::uuid;
      IF v_group_id IS NOT NULL AND to_regclass('public.delivery_group_runs') IS NOT NULL THEN
        EXECUTE
          'UPDATE public.delivery_group_runs SET status = ''awaiting_pickup'', delivery_person_id = NULL, updated_at = now() WHERE id = $1 AND status = ''accepted'''
          USING v_group_id;
      END IF;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'released_count', COALESCE(array_length(v_released_ids, 1), 0),
    'released_ids', to_jsonb(v_released_ids)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.release_stale_accepted_assignments(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_stale_accepted_assignments(integer) TO authenticated, service_role;

-- 3. Planification automatique toutes les 15 minutes via pg_cron (si l'extension est activée)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'release-stale-accepted-deliveries',
      '*/15 * * * *',
      $cron$SELECT public.release_stale_accepted_assignments(210);$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Non bloquant si pg_cron n'est pas disponible sur l'instance
  NULL;
END $$;

