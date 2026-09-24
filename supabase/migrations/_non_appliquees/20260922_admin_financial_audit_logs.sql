-- ============================================================================
-- MIGRATION: 20260922_admin_financial_audit_logs.sql
-- ============================================================================
-- Journalisation obligatoire de toutes les opérations financières administratives :
-- Forçage de synchronisation des payouts, réessais de versements, remboursements
-- partiels et totaux, déblocages de fonds. Traçabilité complète de l'administrateur,
-- du montant, de la date, des bénéficiaires et du contexte.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_financial_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- 'payout_force_sync', 'payout_retry', 'dispute_refund_partial', 'dispute_refund_complete', 'dispute_deliver'
  target_id text, -- ID payout, course, commande ou 'global'
  target_type text, -- 'payout', 'delivery_assignment', 'order', 'system'
  amount integer, -- Montant concerné en FCFA
  currency text DEFAULT 'XOF' NOT NULL,
  recipient_phone text,
  recipient_name text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index pour la rapidité de filtrage et d'affichage dans le dashboard admin
CREATE INDEX IF NOT EXISTS idx_financial_audit_admin_id ON public.admin_financial_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_action_type ON public.admin_financial_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_financial_audit_target_id ON public.admin_financial_audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_created_at ON public.admin_financial_audit_logs(created_at DESC);

-- Activer RLS
ALTER TABLE public.admin_financial_audit_logs ENABLE ROW LEVEL SECURITY;

-- Lecture réservée aux superadmins et admins
DROP POLICY IF EXISTS "Admins can view financial audit logs" ON public.admin_financial_audit_logs;
CREATE POLICY "Admins can view financial audit logs"
  ON public.admin_financial_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND LOWER(users.role) IN ('admin', 'superadmin')
    )
  );

-- Insertion autorisée pour les administrateurs et modérateurs
DROP POLICY IF EXISTS "Admins can insert financial audit logs" ON public.admin_financial_audit_logs;
CREATE POLICY "Admins can insert financial audit logs"
  ON public.admin_financial_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND LOWER(users.role) IN ('admin', 'superadmin', 'moderator', 'moderateur', 'modo')
    )
  );

-- Fonction utilitaire pour journaliser une action financière
CREATE OR REPLACE FUNCTION public.log_admin_financial_action(
  p_action_type text,
  p_target_id text DEFAULT NULL,
  p_target_type text DEFAULT NULL,
  p_amount integer DEFAULT NULL,
  p_recipient_phone text DEFAULT NULL,
  p_recipient_name text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_admin_id uuid;
  v_log_id uuid;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise pour journaliser une action administrative.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = v_admin_id
      AND LOWER(role) IN ('admin', 'superadmin', 'moderator', 'moderateur', 'modo')
  ) THEN
    RAISE EXCEPTION 'Action réservée aux administrateurs.';
  END IF;

  INSERT INTO public.admin_financial_audit_logs (
    admin_id,
    action_type,
    target_id,
    target_type,
    amount,
    currency,
    recipient_phone,
    recipient_name,
    details,
    created_at
  )
  VALUES (
    v_admin_id,
    p_action_type,
    p_target_id,
    p_target_type,
    p_amount,
    'XOF',
    p_recipient_phone,
    p_recipient_name,
    p_details,
    now()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.log_admin_financial_action TO authenticated;

-- Mise à jour de resolve_delivery_dispute pour intégrer la journalisation automatique
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
  v_driver_fee integer;
  v_buyer_phone text;
  v_buyer_name text;
  v_buyer_network text;
  v_driver_user_id uuid;
  v_driver_name text;
  v_driver_phone text;
  v_driver_network text;
  v_mediator_id uuid;
BEGIN
  -- 1. Récupérer l'ID du médiateur authentifié
  v_mediator_id := auth.uid();
  IF v_mediator_id IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  -- 2. Vérifier si le médiateur est autorisé
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

  -- Récupérer noms et téléphones
  SELECT full_name, COALESCE(payout_number, phone), payout_network 
  INTO v_buyer_name, v_buyer_phone, v_buyer_network 
  FROM public.users WHERE id = order_record.buyer_id;

  SELECT name, user_id, COALESCE(payout_number, phone), payout_network 
  INTO v_driver_name, v_driver_user_id, v_driver_phone, v_driver_network
  FROM public.delivery_persons WHERE id = assignment.delivery_person_id;

  -- 5. Exécuter l'action demandée par le médiateur
  IF p_action = 'deliver' THEN
    UPDATE public.delivery_assignments
    SET
      status = 'delivered',
      delivered_at = now(),
      buyer_confirmed_at = now(),
      resolved_by = v_mediator_id,
      resolved_at = now(),
      updated_at = now()
    WHERE id = p_assignment_id;

    UPDATE public.orders
    SET status = 'delivered'
    WHERE id = assignment.order_id;

    SELECT id, seller_amount INTO v_transaction_id, v_seller_amount 
    FROM public.escrow_transactions WHERE order_id = assignment.order_id LIMIT 1;

    IF v_transaction_id IS NOT NULL THEN
      PERFORM public.create_seller_payout(assignment.order_id, v_transaction_id, order_record.seller_id, v_seller_amount);
      PERFORM public.create_delivery_payout(assignment.order_id, v_transaction_id, assignment.delivery_person_id, order_record.delivery_fee);
    END IF;

    -- Journalisation financière
    INSERT INTO public.admin_financial_audit_logs (
      admin_id, action_type, target_id, target_type, amount, recipient_phone, details
    ) VALUES (
      v_mediator_id,
      'dispute_deliver',
      p_assignment_id::text,
      'delivery_assignment',
      COALESCE(v_seller_amount, 0) + COALESCE(order_record.delivery_fee, 0),
      v_driver_phone,
      jsonb_build_object(
        'order_id', order_record.id,
        'seller_amount', v_seller_amount,
        'delivery_fee', order_record.delivery_fee,
        'action', 'deliver_forced'
      )
    );

    RETURN json_build_object('success', true, 'status', 'delivered');

  ELSIF p_action = 'cancel' THEN
    UPDATE public.delivery_assignments
    SET
      status = 'cancelled',
      resolved_by = v_mediator_id,
      resolved_at = now(),
      updated_at = now()
    WHERE id = p_assignment_id;

    UPDATE public.orders
    SET status = 'paid'
    WHERE id = assignment.order_id;

    INSERT INTO public.admin_financial_audit_logs (
      admin_id, action_type, target_id, target_type, amount, details
    ) VALUES (
      v_mediator_id,
      'dispute_cancelled_reassign',
      p_assignment_id::text,
      'delivery_assignment',
      0,
      jsonb_build_object('order_id', order_record.id, 'action', 'cancelled_for_reassign')
    );

    RETURN json_build_object('success', true, 'status', 'cancelled');

  ELSIF p_action = 'refund_complete' THEN
    UPDATE public.delivery_assignments
    SET 
      status = 'cancelled', 
      resolved_by = v_mediator_id,
      resolved_at = now(),
      updated_at = now()
    WHERE id = p_assignment_id;

    UPDATE public.orders
    SET status = 'cancelled', cancel_reason = 'admin_refund_complete', updated_at = now()
    WHERE id = assignment.order_id;

    SELECT id, seller_amount, delivery_fee INTO v_transaction_id, v_seller_amount, v_delivery_fee 
    FROM public.escrow_transactions WHERE order_id = assignment.order_id LIMIT 1;
    
    IF v_transaction_id IS NOT NULL THEN
      INSERT INTO public.payouts (user_id, escrow_id, amount, recipient_phone, withdraw_mode, type, status, scheduled_for, idempotency_key)
      VALUES (order_record.buyer_id, v_transaction_id, order_record.product_amount + order_record.delivery_fee, v_buyer_phone, v_buyer_network, 'refund', 'pending', now(), 'payout_' || order_record.id || '_refund_complete')
      ON CONFLICT DO NOTHING;

      UPDATE public.escrow_transactions SET status = 'refunded', updated_at = now() WHERE id = v_transaction_id;
    END IF;

    -- Journalisation financière du remboursement 100%
    INSERT INTO public.admin_financial_audit_logs (
      admin_id, action_type, target_id, target_type, amount, recipient_phone, recipient_name, details
    ) VALUES (
      v_mediator_id,
      'dispute_refund_complete',
      p_assignment_id::text,
      'delivery_assignment',
      order_record.product_amount + order_record.delivery_fee,
      v_buyer_phone,
      v_buyer_name,
      jsonb_build_object(
        'order_id', order_record.id,
        'product_amount', order_record.product_amount,
        'delivery_fee', order_record.delivery_fee,
        'dispute_reason', assignment.dispute_reason,
        'action', 'refund_100_percent'
      )
    );

    RETURN json_build_object('success', true, 'status', 'refund_complete');

  ELSIF p_action = 'refund_partial' THEN
    UPDATE public.delivery_assignments
    SET 
      status = 'cancelled', 
      resolved_by = v_mediator_id,
      resolved_at = now(),
      updated_at = now()
    WHERE id = p_assignment_id;

    UPDATE public.orders
    SET status = 'cancelled', cancel_reason = 'admin_refund_partial', updated_at = now()
    WHERE id = assignment.order_id;

    SELECT id, seller_amount, delivery_fee INTO v_transaction_id, v_seller_amount, v_delivery_fee 
    FROM public.escrow_transactions WHERE order_id = assignment.order_id LIMIT 1;
    
    IF v_transaction_id IS NOT NULL THEN
      -- Payout de remboursement de l'acheteur (produit uniquement)
      INSERT INTO public.payouts (user_id, escrow_id, amount, recipient_phone, withdraw_mode, type, status, scheduled_for, idempotency_key)
      VALUES (order_record.buyer_id, v_transaction_id, order_record.product_amount, v_buyer_phone, v_buyer_network, 'refund', 'pending', now(), 'payout_' || order_record.id || '_refund_partial')
      ON CONFLICT DO NOTHING;

      -- Payout du livreur (frais de livraison déduction faite de 10% commission)
      v_driver_fee := order_record.delivery_fee - CEIL(order_record.delivery_fee * 0.10);
      IF v_driver_user_id IS NOT NULL THEN
        INSERT INTO public.payouts (user_id, escrow_id, amount, recipient_phone, withdraw_mode, type, status, scheduled_for, idempotency_key, delivery_assignment_id)
        VALUES (v_driver_user_id, v_transaction_id, v_driver_fee, v_driver_phone, v_driver_network, 'delivery', 'pending', now(), 'payout_' || order_record.id || '_delivery_partial', p_assignment_id)
        ON CONFLICT DO NOTHING;
      END IF;

      UPDATE public.escrow_transactions SET status = 'refunded', updated_at = now() WHERE id = v_transaction_id;
    END IF;

    -- Journalisation financière du remboursement partiel (client absent / retour marchand)
    INSERT INTO public.admin_financial_audit_logs (
      admin_id, action_type, target_id, target_type, amount, recipient_phone, recipient_name, details
    ) VALUES (
      v_mediator_id,
      'dispute_refund_partial',
      p_assignment_id::text,
      'delivery_assignment',
      order_record.product_amount,
      v_buyer_phone,
      v_buyer_name,
      jsonb_build_object(
        'order_id', order_record.id,
        'buyer_refund_amount', order_record.product_amount,
        'driver_paid_amount', v_driver_fee,
        'driver_name', v_driver_name,
        'driver_phone', v_driver_phone,
        'dispute_reason', assignment.dispute_reason,
        'package_status', 'returned_to_seller',
        'action', 'partial_refund_absent_client'
      )
    );

    RETURN json_build_object('success', true, 'status', 'refund_partial');

  ELSE
    RETURN json_build_object('success', false, 'reason', 'invalid_action');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
