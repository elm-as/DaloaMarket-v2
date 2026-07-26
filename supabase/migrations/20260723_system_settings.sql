-- Migration: Configuration Système, Mode Maintenance & Urgences Paiement
-- Emplacement: DaloaMarket-v2/supabase/migrations/20260723_system_settings.sql

-- 1. Table system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les paramètres système (pour le mode maintenance et notices d'alerte)
DROP POLICY IF EXISTS "Public read system settings" ON public.system_settings;
CREATE POLICY "Public read system settings"
  ON public.system_settings
  FOR SELECT
  TO public
  USING (true);

-- Seuls les admins/superadmins peuvent insérer/modifier les paramètres système
DROP POLICY IF EXISTS "Admins manage system settings" ON public.system_settings;
CREATE POLICY "Admins manage system settings"
  ON public.system_settings
  FOR ALL
  TO authenticated
  USING (is_admin_or_service_role())
  WITH CHECK (is_admin_or_service_role());

-- 2. Valeurs par défaut
INSERT INTO public.system_settings (key, value)
VALUES 
  (
    'maintenance_mode',
    '{"enabled": false, "expected_reopening": null, "message": "DaloaMarket est actuellement en maintenance pour une amélioration technique. Nous serons de retour très rapidement !"}'::jsonb
  ),
  (
    'payment_settings',
    '{"status": "normal", "notice": "", "disable_online_payments": false, "force_cod_only": false}'::jsonb
  )
ON CONFLICT (key) DO NOTHING;

-- 3. RPC pour mise à jour atomique par les admins
CREATE OR REPLACE FUNCTION update_system_setting(
  p_key TEXT,
  p_value JSONB
)
RETURNS JSON AS $$
BEGIN
  IF NOT is_admin_or_service_role() THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  INSERT INTO public.system_settings (key, value, updated_at, updated_by)
  VALUES (p_key, p_value, now(), auth.uid())
  ON CONFLICT (key) DO UPDATE
  SET 
    value = EXCLUDED.value,
    updated_at = now(),
    updated_by = auth.uid();

  RETURN json_build_object('success', true, 'key', p_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_system_setting TO authenticated;
