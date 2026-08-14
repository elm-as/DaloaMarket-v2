-- ============================================================================
-- MIGRATION: 20260814_buyer_order_cancellation_and_counter.sql
-- ============================================================================
-- 1. Ajout des colonnes de suivi des annulations sur la table users
-- 2. Configuration anti-abus par défaut dans system_settings
-- 3. Suppression des anciennes surcharges de cancel_order_buyer
-- 4. RPC cancel_order_buyer avec gestion fine selon le mode de paiement :
--    - En ligne (MoneyFusion) : Remboursement intégral + Compteur anti-abus
--    - Cash boutique / COD : Annulation simple sans débit ni remboursement
-- 5. RPC reset_user_cancellations pour les administrateurs
-- 6. Réinitialisation des annulations consécutives lors d'une livraison réussie
-- ============================================================================

-- 1. Colonnes sur public.users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS cancellation_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consecutive_cancellations integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_cancellation_at timestamptz;

COMMENT ON COLUMN public.users.cancellation_count IS 'Nombre total de commandes annulées par cet utilisateur.';
COMMENT ON COLUMN public.users.consecutive_cancellations IS 'Nombre d''annulations consécutives de commandes payées en ligne sans achat finalisé avec succès (anti-abus frais MoneyFusion).';
COMMENT ON COLUMN public.users.last_cancellation_at IS 'Date et heure de la dernière annulation effectuée par l''utilisateur.';

-- 2. Configuration dans system_settings
INSERT INTO public.system_settings (key, value)
VALUES (
  'cancellation_settings',
  jsonb_build_object(
    'max_consecutive_cancellations', 3,
    'enabled', true,
    'notice', 'Vous avez atteint la limite de 3 annulations consécutives. Afin d''éviter les frais de transaction répétés, veuillez contacter le support pour toute demande d''annulation.'
  )
)
ON CONFLICT (key) DO NOTHING;

-- 3. Supprimer les anciennes signatures pour éviter l'erreur 42725 (not unique)
DROP FUNCTION IF EXISTS public.cancel_order_buyer(uuid, uuid);
DROP FUNCTION IF EXISTS public.cancel_order_buyer(uuid);
DROP FUNCTION IF EXISTS public.reset_user_cancellations(uuid);

-- 4. RPC cancel_order_buyer : Annulation par l'acheteur
CREATE OR REPLACE FUNCTION public.cancel_order_buyer(
  p_order_id uuid
)
RETURNS json AS $$
DECLARE
  v_order record;
  v_delivery record;
  v_escrow record;
  v_buyer record;
  v_settings jsonb;
  v_max_consecutive integer := 3;
  v_anti_abuse_enabled boolean := true;
  v_custom_notice text;
  v_recipient_phone text;
  v_withdraw_mode text;
  v_is_online_paid boolean := false;
  v_return_message text;
BEGIN
  -- A. Vérifier que l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'not_authenticated', 'message', 'Vous devez être connecté.');
  END IF;

  -- B. Récupérer la commande
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'order_not_found', 'message', 'Commande introuvable.');
  END IF;

  -- C. Vérifier que l'utilisateur est bien l'acheteur
  IF v_order.buyer_id <> auth.uid() THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized', 'message', 'Vous n''êtes pas l''acheteur de cette commande.');
  END IF;

  -- D. Vérifier le statut de la commande
  IF v_order.status IN ('cancelled', 'delivered', 'completed', 'disputed') THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'invalid_order_status',
      'message', 'Cette commande ne peut plus être annulée (statut actuel : ' || v_order.status || ').'
    );
  END IF;

  -- E. Vérifier l'état de la livraison si elle existe
  SELECT * INTO v_delivery FROM public.delivery_assignments WHERE order_id = p_order_id LIMIT 1;
  IF FOUND THEN
    -- Si le livreur a déjà récupéré le colis (picked_up, in_transit, delivered), l'acheteur ne peut plus annuler
    IF v_delivery.status IN ('picked_up', 'in_transit', 'delivered', 'auto_released') THEN
      RETURN json_build_object(
        'success', false,
        'reason', 'already_picked_up',
        'message', 'Le coursier a déjà récupéré le colis chez le vendeur. L''annulation directe n''est plus possible.'
      );
    END IF;

    IF v_delivery.status IN ('cancelled', 'disputed') THEN
      RETURN json_build_object(
        'success', false,
        'reason', 'delivery_closed',
        'message', 'La livraison associée est déjà clôturée ou en litige.'
      );
    END IF;
  END IF;

  -- F. Vérifier s'il s'agit d'un paiement en ligne sécurisé (MoneyFusion / Séquestre)
  SELECT * INTO v_escrow FROM public.escrow_transactions WHERE order_id = p_order_id LIMIT 1;
  IF FOUND AND v_escrow.status IN ('funded', 'held') THEN
    v_is_online_paid := true;
  END IF;

  -- G. Récupérer le profil de l'acheteur
  SELECT * INTO v_buyer FROM public.users WHERE id = auth.uid();

  -- H. Vérifier les paramètres anti-abus (uniquement pour les commandes payées en ligne qui génèrent des frais de remboursement)
  IF v_is_online_paid THEN
    SELECT value INTO v_settings FROM public.system_settings WHERE key = 'cancellation_settings';
    IF v_settings IS NOT NULL THEN
      v_max_consecutive := COALESCE((v_settings->>'max_consecutive_cancellations')::integer, 3);
      v_anti_abuse_enabled := COALESCE((v_settings->>'enabled')::boolean, true);
      v_custom_notice := v_settings->>'notice';
    END IF;

    -- Bloquer si la limite d'annulations consécutives payées est atteinte
    IF v_anti_abuse_enabled AND COALESCE(v_buyer.consecutive_cancellations, 0) >= v_max_consecutive THEN
      RETURN json_build_object(
        'success', false,
        'reason', 'cancellation_limit_reached',
        'message', COALESCE(v_custom_notice, 'Vous avez atteint la limite d''annulations consécutives. Veuillez contacter le support client pour annuler cette commande.')
      );
    END IF;
  END IF;

  -- I. Traitement du remboursement si paiement en ligne (MoneyFusion)
  IF v_is_online_paid THEN
    v_recipient_phone := COALESCE(NULLIF(v_buyer.payout_number, ''), NULLIF(v_buyer.phone, ''));
    v_withdraw_mode := COALESCE(NULLIF(v_buyer.payout_network, ''), 'orange-money-ci');

    IF v_recipient_phone IS NOT NULL THEN
      -- Créer la demande de remboursement intégral pour l'acheteur
      INSERT INTO public.payouts (
        user_id,
        escrow_id,
        amount,
        recipient_phone,
        withdraw_mode,
        type,
        status,
        scheduled_for,
        idempotency_key
      )
      VALUES (
        v_order.buyer_id,
        v_escrow.id,
        v_escrow.total_amount,
        v_recipient_phone,
        v_withdraw_mode,
        'refund',
        'pending',
        now(),
        'payout_' || p_order_id || '_buyer_cancel'
      )
      ON CONFLICT DO NOTHING;
    END IF;

    -- Marquer l'escrow comme remboursé
    UPDATE public.escrow_transactions
    SET status = 'refunded', updated_at = now()
    WHERE id = v_escrow.id;

    v_return_message := 'Commande annulée avec succès. Le remboursement intégral est en cours de traitement.';
  ELSE
    -- Annulation commande Cash Boutique ou COD (aucun paiement n'a eu lieu)
    IF v_order.payment_method = 'cash_at_shop' THEN
      v_return_message := 'Réservation en boutique annulée. Aucun prélèvement n''a été effectué.';
    ELSIF v_order.payment_method = 'cod' THEN
      v_return_message := 'Commande avec paiement à la livraison annulée. Aucun prélèvement n''a été effectué.';
    ELSE
      v_return_message := 'Commande annulée avec succès.';
    END IF;
  END IF;

  -- J. Mettre à jour le statut de la commande
  UPDATE public.orders
  SET
    status = 'cancelled',
    cancel_reason = 'buyer_cancelled',
    updated_at = now()
  WHERE id = p_order_id;

  -- K. Mettre à jour la livraison si présente
  IF v_delivery.id IS NOT NULL THEN
    UPDATE public.delivery_assignments
    SET
      status = 'cancelled',
      updated_at = now()
    WHERE id = v_delivery.id;
  END IF;

  -- L. Mettre à jour les compteurs de l'acheteur
  UPDATE public.users
  SET
    cancellation_count = COALESCE(cancellation_count, 0) + 1,
    consecutive_cancellations = CASE 
      WHEN v_is_online_paid THEN COALESCE(consecutive_cancellations, 0) + 1 
      ELSE COALESCE(consecutive_cancellations, 0) 
    END,
    last_cancellation_at = now()
  WHERE id = auth.uid();

  RETURN json_build_object(
    'success', true,
    'message', v_return_message,
    'is_online_paid', v_is_online_paid,
    'consecutive_cancellations', CASE WHEN v_is_online_paid THEN COALESCE(v_buyer.consecutive_cancellations, 0) + 1 ELSE COALESCE(v_buyer.consecutive_cancellations, 0) END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.cancel_order_buyer(uuid) TO authenticated;

-- 5. RPC reset_user_cancellations : Réinitialisation du compteur d'un utilisateur par un admin/modo
CREATE OR REPLACE FUNCTION public.reset_user_cancellations(
  p_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_admin_id uuid := auth.uid();
BEGIN
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  -- Vérifier les permissions de modération
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = v_admin_id
      AND LOWER(role) IN ('admin', 'superadmin', 'moderator', 'moderateur', 'modo')
  ) THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized', 'message', 'Action réservée aux administrateurs.');
  END IF;

  UPDATE public.users
  SET consecutive_cancellations = 0
  WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Compteur d''annulations consécutives réinitialisé.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reset_user_cancellations(uuid) TO authenticated;

-- 6. Réinitialisation du compteur consécutif lors de la livraison d'une commande
CREATE OR REPLACE FUNCTION public.reset_buyer_consecutive_cancellations_on_delivery()
RETURNS trigger AS $$
BEGIN
  -- Dès qu'une commande passe à delivered ou completed, réinitialiser consecutive_cancellations de l'acheteur
  IF NEW.status IN ('delivered', 'completed') AND (OLD.status IS NULL OR OLD.status NOT IN ('delivered', 'completed')) THEN
    UPDATE public.users
    SET consecutive_cancellations = 0
    WHERE id = NEW.buyer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reset_buyer_cancellations_on_order ON public.orders;

CREATE TRIGGER trg_reset_buyer_cancellations_on_order
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.reset_buyer_consecutive_cancellations_on_delivery();
