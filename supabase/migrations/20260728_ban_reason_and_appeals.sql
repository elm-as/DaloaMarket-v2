-- Migration: Ban Reasons and Ban Appeal System
-- Date: 2026-07-28
-- Description: Ajoute les colonnes de raison de bannissement, de contestation et la fonction RPC de soumission de contestation.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ban_reason text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ban_appeal_reason text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ban_appeal_status text DEFAULT 'none';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ban_appealed_at timestamptz;

-- Function: submit_ban_appeal
-- Permet à un utilisateur banni de soumettre la raison de sa contestation de manière sécurisée
CREATE OR REPLACE FUNCTION submit_ban_appeal(p_reason text)
RETURNS boolean AS $$
DECLARE
  v_banned boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  SELECT banned INTO v_banned FROM public.users WHERE id = auth.uid();

  IF v_banned IS NOT TRUE THEN
    RAISE EXCEPTION 'Votre compte n''est pas suspendu.';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Veuillez préciser la raison de votre contestation.';
  END IF;

  UPDATE public.users
  SET 
    ban_appeal_reason = trim(p_reason),
    ban_appeal_status = 'pending',
    ban_appealed_at = now()
  WHERE id = auth.uid();

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mettre à jour la protection des colonnes de la table users
CREATE OR REPLACE FUNCTION protect_users_columns()
RETURNS TRIGGER AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- 1. Si la ligne ciblée (OLD) est un superadmin, seul un superadmin (ou service_role/postgres) peut y toucher
  IF OLD.role = 'superadmin' THEN
    IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') AND auth.uid() IS NOT NULL THEN
      SELECT LOWER(role) INTO v_caller_role FROM public.users WHERE id = auth.uid();
      IF v_caller_role IS NULL OR v_caller_role != 'superadmin' THEN
        RAISE EXCEPTION 'Seul un SuperAdmin peut modifier ou bannir un compte SuperAdmin.';
      END IF;
    END IF;
  END IF;

  -- 2. Si l'appelant est un administrateur / modérateur / service_role
  IF is_admin_or_service_role() THEN
    RETURN NEW;
  END IF;

  -- 3. Restauration des colonnes sensibles pour les utilisateurs normaux
  NEW.role = OLD.role;
  NEW.banned = OLD.banned;
  NEW.ban_reason = OLD.ban_reason;
  NEW.pro_until = OLD.pro_until;
  NEW.rating = OLD.rating;
  NEW.first_listing_at = OLD.first_listing_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
