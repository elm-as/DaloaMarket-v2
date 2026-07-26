-- =====================================================================================
-- Migration: Add payout settings to users and delivery_persons tables
-- =====================================================================================
-- Allow sellers and drivers to specify exactly which mobile money network and phone number
-- they want to use for receiving funds (payouts), distinct from their contact phone.

-- 1. Pour les vendeurs (users)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_payout_network_check;
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS payout_network text,
  ADD COLUMN IF NOT EXISTS payout_number text;

-- Nettoyer les anciennes valeurs qui ne respectent pas la nouvelle contrainte
UPDATE public.users SET payout_network = NULL WHERE payout_network NOT IN ('orange-money-ci', 'mtn-ci', 'moov-ci', 'wave-ci');

ALTER TABLE public.users ADD CONSTRAINT users_payout_network_check CHECK (payout_network IN ('orange-money-ci', 'mtn-ci', 'moov-ci', 'wave-ci'));

COMMENT ON COLUMN public.users.payout_network IS 'Réseau utilisé pour le retrait des fonds vendeur (ex: wave-ci, orange-money-ci, mtn-ci).';
COMMENT ON COLUMN public.users.payout_number IS 'Numéro de téléphone ou compte pour le retrait des fonds vendeur.';

-- 2. Pour les livreurs (delivery_persons)
ALTER TABLE public.delivery_persons DROP CONSTRAINT IF EXISTS delivery_persons_payout_network_check;
ALTER TABLE public.delivery_persons
  ADD COLUMN IF NOT EXISTS payout_network text,
  ADD COLUMN IF NOT EXISTS payout_number text;

-- Nettoyer les anciennes valeurs qui ne respectent pas la nouvelle contrainte
UPDATE public.delivery_persons SET payout_network = NULL WHERE payout_network NOT IN ('orange-money-ci', 'mtn-ci', 'moov-ci', 'wave-ci');

ALTER TABLE public.delivery_persons ADD CONSTRAINT delivery_persons_payout_network_check CHECK (payout_network IN ('orange-money-ci', 'mtn-ci', 'moov-ci', 'wave-ci'));

COMMENT ON COLUMN public.delivery_persons.payout_network IS 'Réseau utilisé pour le retrait des fonds livreur (ex: wave, orange, mtn).';
COMMENT ON COLUMN public.delivery_persons.payout_number IS 'Numéro de compte pour le retrait des fonds livreur.';

-- 3. Mise à jour RPC Vendeur
CREATE OR REPLACE FUNCTION create_seller_payout(p_order_id uuid, p_escrow_id uuid, p_seller_id uuid, p_seller_amount integer)
RETURNS void AS $$
DECLARE
  v_phone text;
  v_network text;
BEGIN
  -- Chercher d'abord le payout_number, sinon le phone normal
  SELECT COALESCE(payout_number, phone), payout_network INTO v_phone, v_network FROM users WHERE id = p_seller_id;
  IF v_phone IS NULL THEN RETURN; END IF;

  INSERT INTO payouts (user_id, escrow_id, amount, recipient_phone, withdraw_mode, type, status, scheduled_for, idempotency_key)
  VALUES (p_seller_id, p_escrow_id, p_seller_amount, v_phone, v_network, 'seller', 'pending', now() + interval '48 hours', 'payout_' || p_order_id || '_seller')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Mise à jour RPC Livreur
CREATE OR REPLACE FUNCTION create_delivery_payout(p_order_id uuid, p_escrow_id uuid, p_delivery_person_id uuid, p_delivery_fee integer)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_phone text;
  v_network text;
BEGIN
  -- Chercher d'abord le payout_number, sinon le phone normal
  SELECT user_id, COALESCE(payout_number, phone), payout_network INTO v_user_id, v_phone, v_network
    FROM delivery_persons
    WHERE id = p_delivery_person_id;

  IF v_user_id IS NULL THEN RETURN; END IF;
  IF v_phone IS NULL THEN RETURN; END IF;

  -- Trouver l'ID de l'assignation
  DECLARE
    v_assignment_id uuid;
  BEGIN
    SELECT id INTO v_assignment_id FROM delivery_assignments WHERE order_id = p_order_id AND delivery_person_id = p_delivery_person_id LIMIT 1;
    
    INSERT INTO payouts (user_id, escrow_id, amount, recipient_phone, withdraw_mode, type, status, scheduled_for, idempotency_key, delivery_assignment_id)
    VALUES (v_user_id, p_escrow_id, p_delivery_fee, v_phone, v_network, 'delivery', 'pending', now() + interval '48 hours', 'payout_' || p_order_id || '_delivery', v_assignment_id)
    ON CONFLICT DO NOTHING;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Appel des payouts lors de verify_delivery
CREATE OR REPLACE FUNCTION verify_delivery(
  p_assignment_id uuid,
  p_otp text,
  p_photo_url text,
  p_gps_lat double precision,
  p_gps_lng double precision
)
RETURNS json AS $$
DECLARE
  assignment record;
  order_record record;
  distance_m numeric;
  v_transaction_id uuid;
  v_seller_amount integer;
BEGIN
  SELECT * INTO assignment FROM delivery_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'reason', 'assignment_not_found'); END IF;

  SELECT * INTO order_record FROM orders WHERE id = assignment.order_id;
  IF order_record.status != 'in_transit' THEN RETURN json_build_object('success', false, 'reason', 'invalid_order_status'); END IF;

  IF assignment.delivery_otp != p_otp THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_otp');
  END IF;

  IF order_record.delivery_lat IS NULL OR order_record.delivery_lng IS NULL THEN
    distance_m := 0;
  ELSE
    distance_m := calculate_distance(p_gps_lat, p_gps_lng, order_record.delivery_lat, order_record.delivery_lng);
  END IF;

  IF distance_m > 100 THEN
    RETURN json_build_object('success', false, 'reason', 'gps_distance_exceeded', 'distance', distance_m, 'max_distance', 100);
  END IF;

  UPDATE delivery_assignments
  SET
    status = 'delivered',
    delivery_photo_url = p_photo_url,
    delivery_gps = json_build_object('lat', p_gps_lat, 'lng', p_gps_lng),
    delivery_gps_distance_m = distance_m,
    delivered_at = now(),
    buyer_confirmed_at = now(),
    updated_at = now()
  WHERE id = p_assignment_id;

  UPDATE orders
  SET status = 'delivered'
  WHERE id = assignment.order_id;

  -- Déclencher la création des payouts !
  SELECT id, seller_amount INTO v_transaction_id, v_seller_amount FROM escrow_transactions WHERE order_id = assignment.order_id LIMIT 1;
  IF v_transaction_id IS NOT NULL THEN
    PERFORM create_seller_payout(assignment.order_id, v_transaction_id, order_record.seller_id, v_seller_amount);
    PERFORM create_delivery_payout(assignment.order_id, v_transaction_id, assignment.delivery_person_id, order_record.delivery_fee);
  END IF;

  RETURN json_build_object('success', true, 'status', 'delivered', 'distance_m', distance_m);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- S'assurer des droits d'exécution
GRANT EXECUTE ON FUNCTION verify_delivery(uuid, text, text, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION create_seller_payout(uuid, uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION create_delivery_payout(uuid, uuid, uuid, integer) TO authenticated;
