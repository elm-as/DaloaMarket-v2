-- ============================================================================
-- MIGRATION: 20260721_2_secure_dispute_resolution.sql
-- ============================================================================
-- Sécurise la fonction de résolution de litige en autorisant également les 
-- modérateurs (modo) et en stockant l'ID du médiateur qui a résolu le litige.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_delivery_dispute(
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
  v_mediator_id uuid;
BEGIN
  -- 1. Récupérer l'ID du médiateur authentifié
  v_mediator_id := auth.uid();
  IF v_mediator_id IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  -- 2. Vérifier si le médiateur est autorisé (superadmin, admin, moderateur, moderator, modo)
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = v_mediator_id
      AND LOWER(role) IN ('admin', 'superadmin', 'moderator', 'moderateur', 'modo')
  ) THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  -- 3. Récupérer l'attribution de livraison
  SELECT * INTO assignment FROM public.delivery_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN 
    RETURN json_build_object('success', false, 'reason', 'assignment_not_found'); 
  END IF;

  -- 4. Récupérer la commande associée
  SELECT * INTO order_record FROM public.orders WHERE id = assignment.order_id;
  IF NOT FOUND THEN 
    RETURN json_build_object('success', false, 'reason', 'order_not_found'); 
  END IF;

  -- 5. Exécuter l'action demandée par le médiateur
  IF p_action = 'deliver' THEN
    -- Mettre à jour l'attribution (avec traçabilité du médiateur)
    UPDATE public.delivery_assignments
    SET
      status = 'delivered',
      delivered_at = now(),
      buyer_confirmed_at = now(),
      resolved_by = v_mediator_id,
      resolved_at = now(),
      updated_at = now()
    WHERE id = p_assignment_id;

    -- Mettre à jour la commande
    UPDATE public.orders
    SET status = 'delivered'
    WHERE id = assignment.order_id;

    -- Déclencher la création des payouts immédiats
    SELECT id, seller_amount INTO v_transaction_id, v_seller_amount FROM public.escrow_transactions WHERE order_id = assignment.order_id LIMIT 1;
    IF v_transaction_id IS NOT NULL THEN
      PERFORM public.create_seller_payout(assignment.order_id, v_transaction_id, order_record.seller_id, v_seller_amount);
      PERFORM public.create_delivery_payout(assignment.order_id, v_transaction_id, assignment.delivery_person_id, order_record.delivery_fee);
    END IF;

    RETURN json_build_object('success', true, 'status', 'delivered');

  ELSIF p_action = 'cancel' THEN
    -- Annuler la livraison (avec traçabilité du médiateur)
    UPDATE public.delivery_assignments
    SET
      status = 'cancelled',
      resolved_by = v_mediator_id,
      resolved_at = now(),
      updated_at = now()
    WHERE id = p_assignment_id;

    -- Remettre la commande en statut payé pour réattribution ou autre action
    UPDATE public.orders
    SET status = 'paid'
    WHERE id = assignment.order_id;

    RETURN json_build_object('success', true, 'status', 'cancelled');

  ELSIF p_action = 'refund_complete' THEN
    -- Annuler la livraison (avec traçabilité du médiateur)
    UPDATE public.delivery_assignments
    SET 
      status = 'cancelled', 
      resolved_by = v_mediator_id,
      resolved_at = now(),
      updated_at = now()
    WHERE id = p_assignment_id;

    -- Annuler la commande
    UPDATE public.orders
    SET status = 'cancelled', cancel_reason = 'admin_refund_complete', updated_at = now()
    WHERE id = assignment.order_id;

    -- Récupérer l'escrow pour remboursement
    SELECT id, seller_amount, delivery_fee INTO v_transaction_id, v_seller_amount, v_delivery_fee FROM public.escrow_transactions WHERE order_id = assignment.order_id LIMIT 1;
    
    IF v_transaction_id IS NOT NULL THEN
      -- Rembourser l'acheteur du montant total (produit + livraison)
      SELECT COALESCE(payout_number, phone), payout_network INTO v_buyer_phone, v_buyer_network FROM public.users WHERE id = order_record.buyer_id;
      
      INSERT INTO public.payouts (user_id, escrow_id, amount, recipient_phone, withdraw_mode, type, status, scheduled_for, idempotency_key)
      VALUES (order_record.buyer_id, v_transaction_id, order_record.product_amount + order_record.delivery_fee, v_buyer_phone, v_buyer_network, 'refund', 'pending', now(), 'payout_' || order_record.id || '_refund_complete')
      ON CONFLICT DO NOTHING;

      -- Marquer l'escrow comme remboursé
      UPDATE public.escrow_transactions SET status = 'refunded', updated_at = now() WHERE id = v_transaction_id;
    END IF;

    RETURN json_build_object('success', true, 'status', 'refund_complete');

  ELSIF p_action = 'refund_partial' THEN
    -- Annuler la livraison (avec traçabilité du médiateur)
    UPDATE public.delivery_assignments
    SET 
      status = 'cancelled', 
      resolved_by = v_mediator_id,
      resolved_at = now(),
      updated_at = now()
    WHERE id = p_assignment_id;

    -- Annuler la commande
    UPDATE public.orders
    SET status = 'cancelled', cancel_reason = 'admin_refund_partial', updated_at = now()
    WHERE id = assignment.order_id;

    -- Récupérer l'escrow
    SELECT id, seller_amount, delivery_fee INTO v_transaction_id, v_seller_amount, v_delivery_fee FROM public.escrow_transactions WHERE order_id = assignment.order_id LIMIT 1;
    
    IF v_transaction_id IS NOT NULL THEN
      -- Rembourser l'acheteur uniquement du montant du produit
      SELECT COALESCE(payout_number, phone), payout_network INTO v_buyer_phone, v_buyer_network FROM public.users WHERE id = order_record.buyer_id;
      
      INSERT INTO public.payouts (user_id, escrow_id, amount, recipient_phone, withdraw_mode, type, status, scheduled_for, idempotency_key)
      VALUES (order_record.buyer_id, v_transaction_id, order_record.product_amount, v_buyer_phone, v_buyer_network, 'refund', 'pending', now(), 'payout_' || order_record.id || '_refund_partial')
      ON CONFLICT DO NOTHING;

      -- Payout du livreur (frais de livraison - 10%)
      SELECT user_id, COALESCE(payout_number, phone), payout_network INTO v_driver_user_id, v_driver_phone, v_driver_network
      FROM public.delivery_persons WHERE id = assignment.delivery_person_id;
      
      IF v_driver_user_id IS NOT NULL THEN
        INSERT INTO public.payouts (user_id, escrow_id, amount, recipient_phone, withdraw_mode, type, status, scheduled_for, idempotency_key, delivery_assignment_id)
        VALUES (v_driver_user_id, v_transaction_id, order_record.delivery_fee - CEIL(order_record.delivery_fee * 0.10), v_driver_phone, v_driver_network, 'delivery', 'pending', now(), 'payout_' || order_record.id || '_delivery_partial', p_assignment_id)
        ON CONFLICT DO NOTHING;
      END IF;

      -- Marquer l'escrow comme remboursé
      UPDATE public.escrow_transactions SET status = 'refunded', updated_at = now() WHERE id = v_transaction_id;
    END IF;

    RETURN json_build_object('success', true, 'status', 'refund_partial');

  ELSE
    RETURN json_build_object('success', false, 'reason', 'invalid_action');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.resolve_delivery_dispute TO authenticated;
