-- ============================================================
-- RPC : cancel_order_buyer — Annulation d'une commande par l'acheteur
-- DaloaMarket / DaloaDelivery — À exécuter dans l'éditeur SQL Supabase
-- ============================================================
-- Deux cas :
--   Cas A : annulation AVANT pickup → remboursement intégral du produit
--   Cas B : annulation APRÈS pickup (no-show) → livreur payé, acheteur remboursé produit
-- Dans tous les cas, les frais de service (buyer_fee) ne sont PAS remboursables.
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_order_buyer(
  p_order_id uuid,
  p_user_id uuid
) RETURNS json AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_escrow escrow_transactions%ROWTYPE;
  v_delivery delivery_assignments%ROWTYPE;
BEGIN
  -- Vérifier que l'utilisateur est bien l'acheteur
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF v_order.buyer_id != p_user_id THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  -- Vérifier que la commande est annulable
  IF v_order.status IN ('cancelled', 'delivered', 'completed', 'disputed') THEN
    RETURN json_build_object('success', false, 'reason', 'Commande non annulable');
  END IF;

  -- Récupérer l'escrow
  SELECT * INTO v_escrow FROM escrow_transactions WHERE order_id = p_order_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'Escrow introuvable');
  END IF;

  -- Récupérer le delivery_assignment
  SELECT * INTO v_delivery FROM delivery_assignments WHERE order_id = p_order_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'Livraison introuvable');
  END IF;

  -- Déterminer le type de remboursement
  IF v_delivery.status IN ('picked_up', 'in_transit') THEN
    -- Cas B : livreur a déjà récupéré → remboursement partiel
    -- Livreur reçoit delivery_fee - 10%, acheteur récupère product_amount
    -- Vendeur ne reçoit rien (colis retourné)

    -- Payout livreur : delivery_fee - 10%
    INSERT INTO payouts (
      user_id, escrow_id, amount, recipient_phone, type, status,
      withdraw_mode, delivery_assignment_id
    )
    SELECT
      v_delivery.delivery_person_id,
      v_escrow.id,
      v_escrow.delivery_fee - CEIL(v_escrow.delivery_fee * 0.10),
      dp.payout_number,
      'delivery',
      'pending',
      dp.payout_network,
      v_delivery.id
    FROM delivery_persons dp
    WHERE dp.id = v_delivery.delivery_person_id;

    -- Remboursement acheteur : product_amount (frais de service non remboursables)
    INSERT INTO payouts (
      user_id, escrow_id, amount, recipient_phone, type, status
    )
    SELECT
      v_order.buyer_id,
      v_escrow.id,
      v_order.product_amount,
      u.payout_number,
      'refund',
      'pending'
    FROM users u
    WHERE u.id = v_order.buyer_id;

  ELSE
    -- Cas A : annulation avant pickup → remboursement intégral du produit
    -- Acheteur récupère product_amount (frais de service non remboursables)

    -- Remboursement acheteur : product_amount
    INSERT INTO payouts (
      user_id, escrow_id, amount, recipient_phone, type, status
    )
    SELECT
      v_order.buyer_id,
      v_escrow.id,
      v_order.product_amount,
      u.payout_number,
      'refund',
      'pending'
    FROM users u
    WHERE u.id = v_order.buyer_id;

  END IF;

  -- Marquer l'escrow comme refunded
  UPDATE escrow_transactions
  SET status = 'refunded', updated_at = now()
  WHERE id = v_escrow.id;

  -- Marquer la commande comme annulée
  UPDATE orders
  SET status = 'cancelled', cancel_reason = 'buyer', updated_at = now()
  WHERE id = p_order_id;

  -- Marquer le delivery_assignment comme annulé
  UPDATE delivery_assignments
  SET status = 'cancelled', updated_at = now()
  WHERE order_id = p_order_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
