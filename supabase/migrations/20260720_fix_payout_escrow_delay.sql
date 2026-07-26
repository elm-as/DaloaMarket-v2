-- ============================================================================
-- MIGRATION: Suppression du délai d'escrow de 48 heures pour les payouts
-- ============================================================================
-- Ce script modifie les fonctions de création de payouts pour les exécuter
-- immédiatement après la livraison (OTP validée).
-- Exécuter dans le SQL Editor de Supabase.
-- ============================================================================

-- 1. Mise à jour de create_seller_payout pour virement immédiat vendeur
CREATE OR REPLACE FUNCTION public.create_seller_payout(
  p_order_id uuid,
  p_escrow_id uuid,
  p_seller_id uuid,
  p_seller_amount integer
)
RETURNS void AS $$
DECLARE
  v_phone text;
  v_network text;
BEGIN
  -- Chercher d'abord le payout_number, sinon le phone normal
  SELECT COALESCE(payout_number, phone), payout_network INTO v_phone, v_network FROM users WHERE id = p_seller_id;
  IF v_phone IS NULL THEN RETURN; END IF;

  -- Planification immédiate (now() au lieu de now() + interval '48 hours')
  INSERT INTO payouts (user_id, escrow_id, amount, recipient_phone, withdraw_mode, type, status, scheduled_for, idempotency_key)
  VALUES (p_seller_id, p_escrow_id, p_seller_amount, v_phone, v_network, 'seller', 'pending', now(), 'payout_' || p_order_id || '_seller')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Mise à jour de create_delivery_payout pour virement immédiat livreur (avec retenue de 10%)
CREATE OR REPLACE FUNCTION public.create_delivery_payout(
  p_order_id uuid,
  p_escrow_id uuid,
  p_delivery_person_id uuid,
  p_delivery_fee integer
)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_phone text;
  v_network text;
  v_assignment_id uuid;
  v_driver_amount integer;
BEGIN
  -- Chercher d'abord le payout_number, sinon le phone normal
  SELECT user_id, COALESCE(payout_number, phone), payout_network INTO v_user_id, v_phone, v_network
    FROM delivery_persons
    WHERE id = p_delivery_person_id;

  IF v_user_id IS NULL THEN RETURN; END IF;
  IF v_phone IS NULL THEN RETURN; END IF;

  -- Le livreur recoit 90% du prix de livraison (10% de frais de service platform)
  v_driver_amount := p_delivery_fee - round(p_delivery_fee * 0.10);

  -- Trouver l'ID de l'assignation
  SELECT id INTO v_assignment_id FROM delivery_assignments WHERE order_id = p_order_id AND delivery_person_id = p_delivery_person_id LIMIT 1;
    
  -- Planification immédiate (now() au lieu de now() + interval '48 hours')
  INSERT INTO payouts (user_id, escrow_id, amount, recipient_phone, withdraw_mode, type, status, scheduled_for, idempotency_key, delivery_assignment_id)
  VALUES (v_user_id, p_escrow_id, v_driver_amount, v_phone, v_network, 'delivery', 'pending', now(), 'payout_' || p_order_id || '_delivery', v_assignment_id)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
