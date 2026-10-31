-- ============================================================================
-- MIGRATION: 20261031_fix_order_cancellations_and_disputes.sql
-- ============================================================================
-- 1. cancel_order_buyer :
--    - Bloque l'annulation acheteur si orders.status = 'in_transit' (colis COD déjà expédié par le vendeur).
--    - Active app.bypass_user_protection pour garantir la mise à jour des compteurs d'annulation.
-- 2. cancel_order_unavailable :
--    - Bloque l'annulation vendeur si le coursier a déjà ramassé le colis (picked_up / in_transit).
--    - Annule aussi la course si elle était à l'état 'accepted' (afin de prévenir le livreur assigné).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cancel_order_buyer(
  p_order_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
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
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'not_authenticated', 'message', 'Vous devez être connecté.');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'order_not_found', 'message', 'Commande introuvable.');
  END IF;

  IF v_order.buyer_id <> auth.uid() THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized', 'message', 'Vous n''êtes pas l''acheteur de cette commande.');
  END IF;

  IF v_order.status IN ('in_transit', 'picked_up', 'cancelled', 'delivered', 'completed', 'disputed') THEN
    RETURN json_build_object(
      'success', false,
      'reason', CASE WHEN v_order.status IN ('in_transit', 'picked_up') THEN 'already_picked_up' ELSE 'invalid_order_status' END,
      'message', CASE
        WHEN v_order.status IN ('in_transit', 'picked_up') THEN 'Le colis est déjà en cours d''acheminement. L''annulation directe n''est plus possible.'
        ELSE 'Cette commande ne peut plus être annulée (statut actuel : ' || v_order.status || ').'
      END
    );
  END IF;

  SELECT * INTO v_delivery FROM public.delivery_assignments WHERE order_id = p_order_id LIMIT 1;
  IF FOUND THEN
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

  SELECT * INTO v_escrow FROM public.escrow_transactions WHERE order_id = p_order_id LIMIT 1;
  IF FOUND AND v_escrow.status IN ('funded', 'held') THEN
    v_is_online_paid := true;
  END IF;

  SELECT * INTO v_buyer FROM public.users WHERE id = auth.uid();

  IF v_is_online_paid THEN
    SELECT value INTO v_settings FROM public.system_settings WHERE key = 'cancellation_settings';
    IF v_settings IS NOT NULL THEN
      v_max_consecutive := COALESCE((v_settings->>'max_consecutive_cancellations')::integer, 3);
      v_anti_abuse_enabled := COALESCE((v_settings->>'enabled')::boolean, true);
      v_custom_notice := v_settings->>'notice';
    END IF;

    IF v_anti_abuse_enabled AND COALESCE(v_buyer.consecutive_cancellations, 0) >= v_max_consecutive THEN
      RETURN json_build_object(
        'success', false,
        'reason', 'cancellation_limit_reached',
        'message', COALESCE(v_custom_notice, 'Vous avez atteint la limite d''annulations consécutives. Veuillez contacter le support client pour annuler cette commande.')
      );
    END IF;
  END IF;

  IF v_is_online_paid THEN
    v_recipient_phone := COALESCE(NULLIF(v_buyer.payout_number, ''), NULLIF(v_buyer.phone, ''));
    v_withdraw_mode := COALESCE(NULLIF(v_buyer.payout_network, ''), 'orange-money-ci');

    IF v_recipient_phone IS NOT NULL THEN
      INSERT INTO public.payouts (
        user_id, escrow_id, amount, recipient_phone, withdraw_mode,
        type, status, scheduled_for, idempotency_key
      )
      VALUES (
        v_order.buyer_id, v_escrow.id, v_escrow.total_amount, v_recipient_phone, v_withdraw_mode,
        'refund', 'pending', now(), 'payout_' || p_order_id || '_buyer_cancel'
      )
      ON CONFLICT DO NOTHING;
    END IF;

    UPDATE public.escrow_transactions
    SET status = 'refunded', refunded_at = now(), updated_at = now()
    WHERE id = v_escrow.id;

    v_return_message := 'Commande annulée avec succès. Le remboursement intégral est en cours de traitement.';
  ELSE
    IF v_order.payment_method = 'cash_at_shop' THEN
      v_return_message := 'Réservation en boutique annulée. Aucun prélèvement n''a été effectué.';
    ELSIF v_order.payment_method = 'cod' THEN
      v_return_message := 'Commande avec paiement à la livraison annulée. Aucun prélèvement n''a été effectué.';
    ELSE
      v_return_message := 'Commande annulée avec succès.';
    END IF;
  END IF;

  UPDATE public.orders
  SET status = 'cancelled', cancel_reason = 'buyer_cancelled', updated_at = now()
  WHERE id = p_order_id;

  IF v_delivery.id IS NOT NULL THEN
    UPDATE public.delivery_assignments
    SET status = 'cancelled', updated_at = now()
    WHERE id = v_delivery.id;
  END IF;

  PERFORM set_config('app.bypass_user_protection', 'on', true);

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
$$;

GRANT EXECUTE ON FUNCTION public.cancel_order_buyer(uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.cancel_order_unavailable(p_order_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_order    record;
  v_delivery record;
  v_escrow   record;
  v_buyer    record;
  v_phone    text;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
    AND seller_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'order_not_found');
  END IF;

  IF v_order.status NOT IN ('paid', 'pending') THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_status', 'current_status', v_order.status);
  END IF;

  SELECT * INTO v_delivery FROM public.delivery_assignments WHERE order_id = p_order_id LIMIT 1;
  IF FOUND AND v_delivery.status IN ('picked_up', 'in_transit', 'delivered', 'auto_released') THEN
    RETURN json_build_object('success', false, 'reason', 'already_picked_up');
  END IF;

  SELECT * INTO v_escrow FROM public.escrow_transactions
  WHERE order_id = p_order_id AND status IN ('funded', 'held')
  LIMIT 1;

  IF v_escrow.id IS NOT NULL THEN
    SELECT * INTO v_buyer FROM public.users WHERE id = v_order.buyer_id;
    v_phone := COALESCE(NULLIF(v_buyer.payout_number, ''), NULLIF(v_buyer.phone, ''));

    IF v_phone IS NOT NULL THEN
      INSERT INTO public.payouts (
        user_id, escrow_id, amount, recipient_phone, withdraw_mode,
        type, status, scheduled_for, idempotency_key
      )
      VALUES (
        v_order.buyer_id, v_escrow.id, v_escrow.total_amount, v_phone,
        COALESCE(NULLIF(v_buyer.payout_network, ''), 'orange-money-ci'),
        'refund', 'pending', now(),
        'payout_' || p_order_id || '_seller_unavailable'
      )
      ON CONFLICT DO NOTHING;
    END IF;

    UPDATE public.escrow_transactions
    SET status = 'refunded', refunded_at = now(), updated_at = now()
    WHERE id = v_escrow.id;
  END IF;

  UPDATE public.orders
  SET status = 'cancelled', cancel_reason = 'seller_unavailable', updated_at = now()
  WHERE id = p_order_id;

  UPDATE public.delivery_assignments
  SET status = 'cancelled', updated_at = now()
  WHERE order_id = p_order_id
    AND status IN ('pending_seller_confirmation', 'awaiting_pickup', 'accepted');

  RETURN json_build_object(
    'success', true,
    'status', 'cancelled',
    'refunded', v_escrow.id IS NOT NULL
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cancel_order_unavailable(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order_unavailable(uuid) TO authenticated;


-- =============================================================================
-- 3. RLS LISTINGS : Autoriser le vendeur à lire ses propres annonces (y compris
--    celles au statut 'deleted') pour que l'onglet « Vendues » affiche bien les
--    articles ayant fait l'objet de ventes même après suppression de l'annonce.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.can_view_listing_via_order(p_listing_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Acheteur ou Vendeur d'une commande contenant cette annonce
  IF EXISTS (
    SELECT 1 FROM public.orders o
    WHERE (o.listing_id = p_listing_id OR EXISTS (
      SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id AND oi.listing_id = p_listing_id
    ))
    AND (o.buyer_id = p_user_id OR o.seller_id = p_user_id)
  ) THEN
    RETURN true;
  END IF;

  -- 2. Livreur assigné à une commande contenant cette annonce
  IF EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.delivery_assignments da ON da.order_id = o.id
    JOIN public.delivery_persons dp ON dp.id = da.delivery_person_id
    WHERE (o.listing_id = p_listing_id OR EXISTS (
      SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id AND oi.listing_id = p_listing_id
    ))
    AND dp.user_id = p_user_id
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Authors can view own listings" ON public.listings;
CREATE POLICY "Authors can view own listings"
ON public.listings
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
