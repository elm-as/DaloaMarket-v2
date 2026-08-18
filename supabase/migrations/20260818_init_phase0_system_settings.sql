-- Migration: Initialisation des paramètres de la Phase 0 (Rétention & Gratuité)
-- Emplacement: DaloaMarket-v2/supabase/migrations/20260818_init_phase0_system_settings.sql

INSERT INTO public.system_settings (key, value)
VALUES (
  'phase_config',
  '{
    "phase": 0,
    "allow_cod_for_all": true,
    "allow_pickup_for_all": true,
    "allow_affiliated_deliverers_for_all": true,
    "max_free_listings": 999999,
    "enable_boost": true,
    "enable_bump": true,
    "enable_seller_badge": false,
    "default_payment_method": "cod"
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET 
  value = EXCLUDED.value,
  updated_at = now();
