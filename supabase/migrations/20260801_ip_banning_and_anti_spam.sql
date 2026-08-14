-- Migration: IP Banning System & Registration Anti-Spam Filter
-- Date: 2026-08-01
-- Description: Table banned_ips, fonctions RPC de gestion d'IP et trigger de validation d'inscription.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_ip text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS registration_ip text;

-- 1. Table des adresses IP bannies
CREATE TABLE IF NOT EXISTS public.banned_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  reason text,
  banned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Index pour des vérifications ultrarapides lors de chaque appel
CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON public.banned_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_banned_ips_expires ON public.banned_ips(expires_at);

-- Activer RLS
ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;

-- Polices RLS : Seuls les administrateurs et service_role ont accès
DROP POLICY IF EXISTS "Admins manage banned_ips" ON public.banned_ips;
CREATE POLICY "Admins manage banned_ips" ON public.banned_ips
  FOR ALL
  USING (
    current_user IN ('postgres', 'service_role', 'supabase_admin')
    OR (auth.uid() IS NOT NULL AND is_admin_or_service_role())
  );

-- 2. Fonction RPC : is_ip_banned(p_ip text)
CREATE OR REPLACE FUNCTION is_ip_banned(p_ip text)
RETURNS boolean AS $$
DECLARE
  v_is_banned boolean := false;
  v_clean_ip text;
BEGIN
  IF p_ip IS NULL OR trim(p_ip) = '' THEN
    RETURN false;
  END IF;

  v_clean_ip := trim(split_part(p_ip, ',', 1));

  SELECT EXISTS (
    SELECT 1 FROM public.banned_ips
    WHERE ip_address = v_clean_ip
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_is_banned;

  RETURN v_is_banned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fonction RPC d'administration : ban_ip(p_ip, p_reason, p_duration_days)
CREATE OR REPLACE FUNCTION ban_ip(
  p_ip text,
  p_reason text DEFAULT NULL,
  p_duration_days integer DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_clean_ip text;
  v_expires_at timestamptz := NULL;
BEGIN
  -- Vérification des privilèges admin
  IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
    IF auth.uid() IS NULL OR NOT is_admin_or_service_role() THEN
      RAISE EXCEPTION 'Seul un administrateur peut bannir une adresse IP.';
    END IF;
  END IF;

  IF p_ip IS NULL OR trim(p_ip) = '' THEN
    RAISE EXCEPTION 'Veuillez fournir une adresse IP valide.';
  END IF;

  v_clean_ip := trim(split_part(p_ip, ',', 1));

  IF p_duration_days IS NOT NULL AND p_duration_days > 0 THEN
    v_expires_at := now() + (p_duration_days || ' days')::interval;
  END IF;

  INSERT INTO public.banned_ips (ip_address, reason, banned_by, expires_at)
  VALUES (v_clean_ip, p_reason, auth.uid(), v_expires_at)
  ON CONFLICT (ip_address) 
  DO UPDATE SET 
    reason = EXCLUDED.reason,
    banned_by = EXCLUDED.banned_by,
    expires_at = EXCLUDED.expires_at,
    created_at = now();

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fonction RPC d'administration : unban_ip(p_ip)
CREATE OR REPLACE FUNCTION unban_ip(p_ip text)
RETURNS boolean AS $$
DECLARE
  v_clean_ip text;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
    IF auth.uid() IS NULL OR NOT is_admin_or_service_role() THEN
      RAISE EXCEPTION 'Seul un administrateur peut débannir une adresse IP.';
    END IF;
  END IF;

  v_clean_ip := trim(split_part(p_ip, ',', 1));

  DELETE FROM public.banned_ips WHERE ip_address = v_clean_ip;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger de Sécurité Inscription Anti-Spam & Ban IP sur public.users
CREATE OR REPLACE FUNCTION validate_user_registration_and_ip()
RETURNS TRIGGER AS $$
DECLARE
  v_headers json;
  v_raw_ip text;
  v_client_ip text;
  v_email_domain text;
  v_phone_clean text;
BEGIN
  -- A. Récupération de l'adresse IP cliente depuis les en-têtes HTTP de la requête Supabase
  BEGIN
    v_headers := current_setting('request.headers', true)::json;
    IF v_headers IS NOT NULL THEN
      v_raw_ip := COALESCE(
        v_headers->>'x-forwarded-for',
        v_headers->>'cf-connecting-ip',
        v_headers->>'x-real-ip'
      );
      IF v_raw_ip IS NOT NULL AND trim(v_raw_ip) != '' THEN
        v_client_ip := trim(split_part(v_raw_ip, ',', 1));
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_client_ip := NULL;
  END;

  -- B. Contrôle du Bannissement IP
  IF v_client_ip IS NOT NULL THEN
    NEW.last_ip := v_client_ip;
    NEW.registration_ip := v_client_ip;

    IF is_ip_banned(v_client_ip) THEN
      RAISE EXCEPTION 'Inscription refusée : Votre adresse IP (%) est bannie.', v_client_ip;
    END IF;
  END IF;

  -- C. Contrôle des Adresses Email Jetables / Temporaires
  IF NEW.email IS NOT NULL THEN
    v_email_domain := lower(trim(split_part(NEW.email, '@', 2)));
    IF v_email_domain IN (
      'kierko.com', 'aganseo.com', 'tempmail.com', 'yopmail.com', 
      'guerrillamail.com', '10minutemail.com', 'mailinator.com', 
      'dispostable.com', 'trashmail.com', 'getnada.com'
    ) THEN
      RAISE EXCEPTION 'Inscription refusée : Les adresses email jetables (@%) ne sont pas autorisées.', v_email_domain;
    END IF;
  END IF;

  -- D. Contrôle des Numéros de Téléphone Factices / Test
  IF NEW.phone IS NOT NULL THEN
    v_phone_clean := regexp_replace(NEW.phone, '[^0-9]', '', 'g');
    IF v_phone_clean IN (
      '0101010101', '0710101010', '0000000000', '1234567890', 
      '0102030405', '0505050505', '0707070707', '0808080808', 
      '0909090909', '0101010100'
    ) THEN
      RAISE EXCEPTION 'Inscription refusée : Le numéro de téléphone spécifié est invalide.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attacher le trigger sur BEFORE INSERT ON public.users
DROP TRIGGER IF EXISTS trigger_validate_user_registration ON public.users;
CREATE TRIGGER trigger_validate_user_registration
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_registration_and_ip();
