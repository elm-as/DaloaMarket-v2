-- Migration: Add payout settings to users table
-- =====================================================================================
-- Allow sellers to specify exactly which mobile money network and phone number
-- they want to use for receiving funds (payouts), distinct from their contact phone.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS payout_network text CHECK (payout_network IN ('orange', 'mtn', 'moov', 'wave', 'djamo')),
  ADD COLUMN IF NOT EXISTS payout_number text;

COMMENT ON COLUMN public.users.payout_network IS 'Réseau utilisé pour le retrait des fonds (ex: wave, orange, mtn).';
COMMENT ON COLUMN public.users.payout_number IS 'Numéro de téléphone ou compte pour le retrait des fonds.';
