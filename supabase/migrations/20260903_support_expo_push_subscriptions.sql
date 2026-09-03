-- ==============================================================================
-- Migration: Support complet des notifications Push Expo (Mobile) et Web Push
-- Permet aux colonnes endpoint et keys d'être nulles quand expo_push_token est présent
-- ==============================================================================

ALTER TABLE public.push_subscriptions ALTER COLUMN endpoint DROP NOT NULL;
ALTER TABLE public.push_subscriptions ALTER COLUMN keys_p256dh DROP NOT NULL;
ALTER TABLE public.push_subscriptions ALTER COLUMN keys_auth DROP NOT NULL;

-- Contrainte: au moins endpoint (web) OU expo_push_token (mobile) doit être présent
ALTER TABLE public.push_subscriptions 
  DROP CONSTRAINT IF EXISTS push_subscriptions_target_check;
ALTER TABLE public.push_subscriptions 
  ADD CONSTRAINT push_subscriptions_target_check 
  CHECK (endpoint IS NOT NULL OR expo_push_token IS NOT NULL);

-- Index sur expo_push_token pour accélérer la recherche et déduplication
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_expo_token 
  ON public.push_subscriptions(expo_push_token);
