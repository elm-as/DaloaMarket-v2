-- Migration: Restructure escrow pour créer les orders uniquement après paiement confirmé
-- =====================================================================================
-- Problème: Actuellement, une "order" est créée en DB AVANT que l'utilisateur ait payé.
-- Si l'utilisateur abandonne, on se retrouve avec des commandes fantômes "pending" partout.
--
-- Solution: L'escrow_transaction est créé comme "intention de paiement" (léger, invisible).
-- L'order n'est créée qu'après confirmation du paiement par Money Fusion.

-- 1. Rendre order_id nullable (l'order n'existe pas encore au moment de la création de l'escrow)
ALTER TABLE escrow_transactions 
  ALTER COLUMN order_id DROP NOT NULL;

-- 2. Ajouter une colonne pour stocker les métadonnées de la future commande
-- (listing_id, delivery_address, delivery_mode, prix produit, coordonnées GPS, etc.)
ALTER TABLE escrow_transactions 
  ADD COLUMN IF NOT EXISTS order_metadata jsonb DEFAULT NULL;

-- 3. Commenter pour la documentation
COMMENT ON COLUMN escrow_transactions.order_id IS 
  'FK vers orders. NULL tant que le paiement n''est pas confirmé. Rempli par le webhook/check-payment.';

COMMENT ON COLUMN escrow_transactions.order_metadata IS 
  'Métadonnées JSON pour créer l''order après confirmation du paiement. Contient: listing_id, product_amount, delivery_address, delivery_mode, delivery_lat, delivery_lng.';
