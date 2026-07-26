-- Migration: Add Moderation Roles
-- Date: 2026-07-16
-- Description: Met à jour la fonction de sécurité is_admin_or_service_role pour inclure superadmin, moderateur et helper.

CREATE OR REPLACE FUNCTION is_admin_or_service_role()
RETURNS boolean AS $$
DECLARE
  v_role text;
BEGIN
  -- Si on est le backend ou un RPC avec privilèges
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN true;
  END IF;
  
  -- Vérification du rôle admin (sensible à la casse via LOWER)
  IF auth.uid() IS NOT NULL THEN
    SELECT LOWER(role) INTO v_role FROM public.users WHERE id = auth.uid();
    IF v_role IN ('superadmin', 'admin', 'moderateur', 'helper') THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SÉCURITÉ DE NIVEAU SUPERADMIN : Empêcher les autres rôles de modifier ou bannir un SuperAdmin
CREATE OR REPLACE FUNCTION protect_users_columns()
RETURNS TRIGGER AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- 1. Si la ligne ciblée (OLD) est un superadmin, seul un superadmin (ou le service_role/postgres) a le droit d'y toucher
  IF OLD.role = 'superadmin' THEN
    IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') AND auth.uid() IS NOT NULL THEN
      SELECT LOWER(role) INTO v_caller_role FROM public.users WHERE id = auth.uid();
      IF v_caller_role IS NULL OR v_caller_role != 'superadmin' THEN
        RAISE EXCEPTION 'Seul un SuperAdmin peut modifier ou bannir un compte SuperAdmin.';
      END IF;
    END IF;
  END IF;

  -- 2. Si c'est une modification classique par un membre de l'équipe
  IF is_admin_or_service_role() THEN
    RETURN NEW;
  END IF;

  -- 3. Restauration des colonnes protégées pour les utilisateurs simples
  NEW.role = OLD.role;
  NEW.banned = OLD.banned;
  NEW.pro_until = OLD.pro_until;
  NEW.rating = OLD.rating;
  NEW.first_listing_at = OLD.first_listing_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
