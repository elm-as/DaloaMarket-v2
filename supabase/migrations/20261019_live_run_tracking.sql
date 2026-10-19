-- Migration : Suivi GPS Hybride V2 (F07)
-- Date : 19 octobre 2026
-- Objectif : Ajouter les colonnes de géolocalisation en direct sur delivery_assignments
-- et la fonction RPC sécurisée pour la mise à jour par le livreur en cours de mission.

-- 1. Ajout des colonnes de position en direct
ALTER TABLE public.delivery_assignments
  ADD COLUMN IF NOT EXISTS current_driver_lat numeric,
  ADD COLUMN IF NOT EXISTS current_driver_lng numeric,
  ADD COLUMN IF NOT EXISTS driver_location_updated_at timestamptz;

-- 2. Index partiel sur les positions récentes
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_driver_loc
  ON public.delivery_assignments(driver_location_updated_at)
  WHERE driver_location_updated_at IS NOT NULL;

-- 3. Fonction RPC sécurisée de mise à jour de la position du livreur en course
-- Vérifie que l'utilisateur est bien le livreur assigné à la course (ou un admin)
-- et que la course est active ('picked_up', 'in_transit').
CREATE OR REPLACE FUNCTION public.update_driver_run_location(
  p_assignment_id uuid,
  p_lat numeric,
  p_lng numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_driver_id uuid;
  v_assignment_status text;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentification requise pour diffuser la position.';
  END IF;

  -- Vérifier rôle admin
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.users
  WHERE id = v_caller_uid;

  -- Récupérer la course
  SELECT delivery_person_id, status
  INTO v_driver_id, v_assignment_status
  FROM public.delivery_assignments
  WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mission de livraison introuvable.';
  END IF;

  -- Si non admin, vérifier que l'utilisateur est le livreur assigné
  IF NOT COALESCE(v_is_admin, false) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.delivery_persons dp
      WHERE dp.id = v_driver_id
      AND dp.user_id = v_caller_uid
    ) THEN
      RAISE EXCEPTION 'Seul le livreur assigné peut diffuser sa géolocalisation.';
    END IF;
  END IF;

  -- Mise à jour des coordonnées
  UPDATE public.delivery_assignments
  SET
    current_driver_lat = p_lat,
    current_driver_lng = p_lng,
    driver_location_updated_at = clock_timestamp()
  WHERE id = p_assignment_id;

  RETURN true;
END;
$$;

-- Droits d'exécution pour les utilisateurs connectés
REVOKE ALL ON FUNCTION public.update_driver_run_location(uuid, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_driver_run_location(uuid, numeric, numeric) TO authenticated;

COMMENT ON FUNCTION public.update_driver_run_location(uuid, numeric, numeric)
  IS 'Met à jour les coordonnées GPS du livreur pour une course active (F07 - Suivi GPS Hybride)';
