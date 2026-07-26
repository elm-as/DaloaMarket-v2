-- ========================================================
-- MIGRATION: 20260719_3_admin_dispute_refunds.sql
-- ========================================================

-- 1. Autoriser les admins et superadmins à modifier les profils de n'importe quel utilisateur (changement de rôle)
DROP POLICY IF EXISTS "Admins can update any user profile" ON public.users;

CREATE POLICY "Admins can update any user profile" 
  ON public.users 
  FOR UPDATE 
  TO authenticated
  USING (is_admin_or_service_role())
  WITH CHECK (is_admin_or_service_role());

-- 1.bis Synchroniser les profils d'utilisateurs existants (nom 'N/A') à partir des détails livreur
UPDATE public.users u
SET 
  full_name = COALESCE(NULLIF(u.full_name, 'N/A'), dp.name),
  phone = COALESCE(NULLIF(u.phone, ''), dp.phone)
FROM public.delivery_persons dp
WHERE u.id = dp.user_id
  AND (u.full_name IS NULL OR u.full_name = 'N/A' OR u.full_name = '');

-- 2. Mettre à jour la fonction de résolution de litige avec les modes de remboursement
CREATE OR REPLACE FUNCTION resolve_delivery_dispute(
  p_assignment_id uuid,
  p_action text -- 'deliver', 'cancel', 'refund_complete', 'refund_partial'
)
RETURNS json AS $$
DECLARE
  assignment record;
  order_record record;
  v_transaction_id uuid;
  v_seller_amount integer;
  v_delivery_fee integer;
  v_buyer_phone text;
  v_buyer_network text;
  v_driver_user_id uuid;
  v_driver_phone text;
  v_driver_network text;
BEGIN
  -- Vérifier si l'utilisateur est un admin ou superadmin
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  ) THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  SELECT * INTO assignment FROM delivery_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'reason', 'assignment_not_found'); END IF;

  SELECT * INTO order_record FROM orders WHERE id = assignment.order_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'reason', 'order_not_found'); END IF;

  IF p_action = 'deliver' THEN
    -- Mettre à jour l'attribution
    UPDATE delivery_assignments
    SET
      status = 'delivered',
      delivered_at = now(),
      buyer_confirmed_at = now(),
      updated_at = now()
    WHERE id = p_assignment_id;

    -- Mettre à jour la commande
    UPDATE orders
    SET status = 'delivered'
    WHERE id = assignment.order_id;

    -- Déclencher la création des payouts !
    SELECT id, seller_amount INTO v_transaction_id, v_seller_amount FROM escrow_transactions WHERE order_id = assignment.order_id LIMIT 1;
    IF v_transaction_id IS NOT NULL THEN
      PERFORM create_seller_payout(assignment.order_id, v_transaction_id, order_record.seller_id, v_seller_amount);
      PERFORM create_delivery_payout(assignment.order_id, v_transaction_id, assignment.delivery_person_id, order_record.delivery_fee);
    END IF;

    RETURN json_build_object('success', true, 'status', 'delivered');

  ELSIF p_action = 'cancel' THEN
    -- Annuler la livraison
    UPDATE delivery_assignments
    SET
      status = 'cancelled',
      updated_at = now()
    WHERE id = p_assignment_id;

    -- Remettre la commande en statut payé pour réattribution ou autre
    UPDATE orders
    SET status = 'paid'
    WHERE id = assignment.order_id;

    RETURN json_build_object('success', true, 'status', 'cancelled');

  ELSIF p_action = 'refund_complete' THEN
    -- Annuler la livraison
    UPDATE delivery_assignments
    SET status = 'cancelled', updated_at = now()
    WHERE id = p_assignment_id;

    -- Annuler la commande
    UPDATE orders
    SET status = 'cancelled', cancel_reason = 'admin_refund_complete', updated_at = now()
    WHERE id = assignment.order_id;

    -- Récupérer l'escrow
    SELECT id, seller_amount, delivery_fee INTO v_transaction_id, v_seller_amount, v_delivery_fee FROM escrow_transactions WHERE order_id = assignment.order_id LIMIT 1;
    
    IF v_transaction_id IS NOT NULL THEN
      -- Rembourser l'acheteur du montant total (produit + livraison)
      SELECT COALESCE(payout_number, phone), payout_network INTO v_buyer_phone, v_buyer_network FROM users WHERE id = order_record.buyer_id;
      
      INSERT INTO payouts (user_id, escrow_id, amount, recipient_phone, withdraw_mode, type, status, idempotency_key)
      VALUES (order_record.buyer_id, v_transaction_id, order_record.product_amount + order_record.delivery_fee, v_buyer_phone, v_buyer_network, 'refund', 'pending', 'payout_' || order_record.id || '_refund_complete')
      ON CONFLICT DO NOTHING;

      -- Marquer l'escrow comme remboursé
      UPDATE escrow_transactions SET status = 'refunded', updated_at = now() WHERE id = v_transaction_id;
    END IF;

    RETURN json_build_object('success', true, 'status', 'refund_complete');

  ELSIF p_action = 'refund_partial' THEN
    -- Annuler la livraison
    UPDATE delivery_assignments
    SET status = 'cancelled', updated_at = now()
    WHERE id = p_assignment_id;

    -- Annuler la commande
    UPDATE orders
    SET status = 'cancelled', cancel_reason = 'admin_refund_partial', updated_at = now()
    WHERE id = assignment.order_id;

    -- Récupérer l'escrow
    SELECT id, seller_amount, delivery_fee INTO v_transaction_id, v_seller_amount, v_delivery_fee FROM escrow_transactions WHERE order_id = assignment.order_id LIMIT 1;
    
    IF v_transaction_id IS NOT NULL THEN
      -- Rembourser l'acheteur uniquement du montant du produit
      SELECT COALESCE(payout_number, phone), payout_network INTO v_buyer_phone, v_buyer_network FROM users WHERE id = order_record.buyer_id;
      
      INSERT INTO payouts (user_id, escrow_id, amount, recipient_phone, withdraw_mode, type, status, idempotency_key)
      VALUES (order_record.buyer_id, v_transaction_id, order_record.product_amount, v_buyer_phone, v_buyer_network, 'refund', 'pending', 'payout_' || order_record.id || '_refund_partial')
      ON CONFLICT DO NOTHING;

      -- Payout du livreur (frais de livraison - 10%)
      SELECT user_id, COALESCE(payout_number, phone), payout_network INTO v_driver_user_id, v_driver_phone, v_driver_network
      FROM delivery_persons WHERE id = assignment.delivery_person_id;
      
      IF v_driver_user_id IS NOT NULL THEN
        INSERT INTO payouts (user_id, escrow_id, amount, recipient_phone, withdraw_mode, type, status, idempotency_key, delivery_assignment_id)
        VALUES (v_driver_user_id, v_transaction_id, order_record.delivery_fee - CEIL(order_record.delivery_fee * 0.10), v_driver_phone, v_driver_network, 'delivery', 'pending', 'payout_' || order_record.id || '_delivery_partial', p_assignment_id)
        ON CONFLICT DO NOTHING;
      END IF;

      -- Marquer l'escrow comme remboursé
      UPDATE escrow_transactions SET status = 'refunded', updated_at = now() WHERE id = v_transaction_id;
    END IF;

    RETURN json_build_object('success', true, 'status', 'refund_partial');

  ELSE
    RETURN json_build_object('success', false, 'reason', 'invalid_action');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
