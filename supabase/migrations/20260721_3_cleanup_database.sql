-- ============================================================================
-- MIGRATION: 20260721_3_cleanup_database.sql
-- ============================================================================
-- Effectue les nettoyages de structure demandés :
-- 1. Renommer les tables inutilisées en _deprecated_ pour sécurité avant suppression.
-- 2. Supprimer la colonne doublon 'verified' sur delivery_persons (gardant 'is_verified').
-- 3. Supprimer les overloads inutilisés de la fonction calculate_distance.
-- ============================================================================

-- 1. Renommage des tables mortes
ALTER TABLE IF EXISTS public.reservations RENAME TO _deprecated_reservations;
ALTER TABLE IF EXISTS public.delivery_requests RENAME TO _deprecated_delivery_requests;
ALTER TABLE IF EXISTS public.delivery_offers RENAME TO _deprecated_delivery_offers;
ALTER TABLE IF EXISTS public.payment_methods RENAME TO _deprecated_payment_methods;
ALTER TABLE IF EXISTS public.user_reliability RENAME TO _deprecated_user_reliability;

-- 2. Nettoyage du doublon verified / is_verified
-- (Seule la colonne is_verified est utilisée dans l'application)
ALTER TABLE IF EXISTS public.delivery_persons DROP COLUMN IF EXISTS verified;

-- 3. Suppression des surcharges (overloads) inutiles de calculate_distance
-- (La version active utilisée par verify_pickup/verify_delivery utilise calculate_distance(numeric, numeric, numeric, numeric))
DROP FUNCTION IF EXISTS public.calculate_distance(double precision, double precision, double precision, double precision);
DROP FUNCTION IF EXISTS public.calculate_distance(numeric, numeric);
DROP FUNCTION IF EXISTS public.calculate_distance(point, point);
DROP FUNCTION IF EXISTS public.calculate_distance(geography, geography);
