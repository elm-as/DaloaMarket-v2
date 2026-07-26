-- Migration pour corriger les failles de sécurité du flow de livraison
-- Date: 7 juillet 2026
-- Objectif: Séparer les OTP, ajouter statut 'accepted', améliorer tracking GPS

-- 1. Ajouter les colonnes pour les deux OTP distincts
ALTER TABLE public.delivery_assignments
ADD COLUMN IF NOT EXISTS pickup_otp text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS delivery_otp text NOT NULL DEFAULT '';

-- 2. Ajouter le statut 'accepted' au CHECK constraint
-- D'abord, supprimer l'ancienne contrainte si elle existe
ALTER TABLE public.delivery_assignments
DROP CONSTRAINT IF EXISTS delivery_assignments_status_check;

-- Recréer la contrainte avec 'accepted'
ALTER TABLE public.delivery_assignments
ADD CONSTRAINT delivery_assignments_status_check
CHECK (status = ANY (ARRAY['awaiting_pickup'::text, 'accepted'::text, 'picked_up'::text, 'in_transit'::text, 'delivered'::text, 'auto_released'::text, 'disputed'::text, 'cancelled'::text]));

-- 3. Ajouter les colonnes pour le tracking des tentatives OTP
ALTER TABLE public.delivery_assignments
ADD COLUMN IF NOT EXISTS pickup_otp_attempts integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_otp_attempts integer NOT NULL DEFAULT 0;

-- 4. Ajouter la colonne pour le timestamp d'acceptation
ALTER TABLE public.delivery_assignments
ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone;

-- 5. Ajouter les colonnes pour les distances GPS (déjà existantes dans le schéma, mais on s'assure qu'elles sont là)
ALTER TABLE public.delivery_assignments
ADD COLUMN IF NOT EXISTS pickup_gps_distance_m integer,
ADD COLUMN IF NOT EXISTS delivery_gps_distance_m integer;

-- 6. Mettre à jour les enregistrements existants pour la compatibilité
-- Pour les enregistrements existants, on utilise delivery_otp comme pickup_otp par défaut
UPDATE public.delivery_assignments
SET pickup_otp = delivery_otp
WHERE pickup_otp = '' AND delivery_otp IS NOT NULL;

-- 7. Ajouter un commentaire pour documenter les changements
COMMENT ON COLUMN public.delivery_assignments.pickup_otp IS 'OTP pour ramassage chez le vendeur (communiqué uniquement au vendeur)';
COMMENT ON COLUMN public.delivery_assignments.delivery_otp IS 'OTP pour livraison chez l''acheteur (communiqué uniquement à l''acheteur)';
COMMENT ON COLUMN public.delivery_assignments.accepted_at IS 'Timestamp quand le livreur a accepté la commande (pour le timeout de 90min)';
COMMENT ON COLUMN public.delivery_assignments.pickup_otp_attempts IS 'Nombre de tentatives OTP pour ramassage (max 3 avant litige)';
COMMENT ON COLUMN public.delivery_assignments.delivery_otp_attempts IS 'Nombre de tentatives OTP pour livraison (max 3 avant litige)';
COMMENT ON COLUMN public.delivery_assignments.pickup_gps_distance_m IS 'Distance GPS entre livreur et vendeur au ramassage (max 100m toléré)';
COMMENT ON COLUMN public.delivery_assignments.delivery_gps_distance_m IS 'Distance GPS entre livreur et acheteur à la livraison (max 100m toléré)';
