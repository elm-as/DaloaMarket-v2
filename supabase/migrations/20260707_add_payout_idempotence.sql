-- Migration pour ajouter les champs d'idempotence à la table payouts
-- Date: 7 juillet 2026
-- Objectif: Prévenir les double payouts MoneyFusion

-- 1. Ajouter les champs d'idempotence
ALTER TABLE public.payouts
ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE,
ADD COLUMN IF NOT EXISTS provider_token text UNIQUE,
ADD COLUMN IF NOT EXISTS delivery_assignment_id uuid;

-- 2. Ajouter la foreign key vers delivery_assignments
ALTER TABLE public.payouts
ADD CONSTRAINT payouts_delivery_assignment_id_fkey
FOREIGN KEY (delivery_assignment_id) REFERENCES public.delivery_assignments(id);

-- 3. Ajouter un index sur delivery_assignment_id pour les performances
CREATE INDEX IF NOT EXISTS idx_payouts_delivery_assignment_id 
ON public.payouts(delivery_assignment_id);

-- 4. Ajouter un index sur idempotency_key pour les performances
CREATE INDEX IF NOT EXISTS idx_payouts_idempotency_key 
ON public.payouts(idempotency_key);

-- 5. Ajouter des commentaires pour documenter les champs
COMMENT ON COLUMN public.payouts.idempotency_key IS 'Clé d''idempotence pour éviter les double payouts (format: payout_{assignment_id}_{type})';
COMMENT ON COLUMN public.payouts.provider_token IS 'TokenPay retourné par MoneyFusion pour le suivi du payout';
COMMENT ON COLUMN public.payouts.delivery_assignment_id IS 'Référence vers delivery_assignments pour lier le payout à une livraison spécifique';
