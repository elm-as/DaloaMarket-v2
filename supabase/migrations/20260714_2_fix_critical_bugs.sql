-- Migration: Fix Critical Bugs identified in DB Audit
-- Date: 2026-07-14

-- 1. Fix protect_listings_columns (removed non-existent is_boosted and views_count)
CREATE OR REPLACE FUNCTION protect_listings_columns()
RETURNS trigger AS $$
BEGIN
  IF is_admin_or_service_role() THEN
    RETURN NEW;
  END IF;

  -- Removed is_boosted since it doesn't exist on listings
  NEW.boosted_until = OLD.boosted_until;
  NEW.status = OLD.status;
  NEW.user_id = OLD.user_id;
  -- Fixed typo: views_count -> view_count
  NEW.view_count = OLD.view_count;
  NEW.created_at = OLD.created_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix confirm_order_payment (removed non-existent has_sold on users)
CREATE OR REPLACE FUNCTION confirm_order_payment(p_transaction_id uuid)
RETURNS void AS $$
DECLARE
  v_tx monetization_transactions%ROWTYPE;
  v_order_id uuid;
  v_delivery_otp text;
BEGIN
  SELECT * INTO v_tx FROM monetization_transactions WHERE id = p_transaction_id;
  IF NOT FOUND OR v_tx.type <> 'order' THEN RETURN; END IF;
  IF v_tx.status = 'confirmed' THEN RETURN; END IF;

  -- Find the order created during create-payment
  SELECT id INTO v_order_id FROM orders
    WHERE buyer_id = v_tx.user_id
    ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN RETURN; END IF;

  -- Generate OTP
  v_delivery_otp := LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');

  -- Create delivery assignment with OTP
  INSERT INTO delivery_assignments (order_id, delivery_otp)
  VALUES (v_order_id, v_delivery_otp)
  ON CONFLICT (order_id) DO NOTHING;

  -- Update escrow to funded
  UPDATE escrow_transactions
    SET status = 'funded', funded_at = now()
    WHERE order_id = v_order_id AND status = 'pending';

  -- Update order status to paid
  UPDATE orders SET status = 'paid', updated_at = now() WHERE id = v_order_id;

  -- Create refund reserve (1%)
  INSERT INTO refund_reserve (order_id, amount)
  SELECT v_order_id, reserve_fee FROM orders WHERE id = v_order_id
  ON CONFLICT DO NOTHING;

  -- Mark transaction confirmed
  UPDATE monetization_transactions SET status = 'confirmed', confirmed_at = now() WHERE id = p_transaction_id;

  -- Removed: UPDATE users SET has_sold = true (column does not exist)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix create_seller_payout (mobile_money_phone does not exist, use phone)
CREATE OR REPLACE FUNCTION create_seller_payout(p_order_id uuid, p_escrow_id uuid, p_seller_id uuid, p_seller_amount integer)
RETURNS void AS $$
DECLARE
  v_phone text;
BEGIN
  SELECT phone INTO v_phone FROM users WHERE id = p_seller_id;
  IF v_phone IS NULL THEN RETURN; END IF;

  INSERT INTO payouts (user_id, escrow_id, amount, recipient_phone, type, status, scheduled_for)
  VALUES (p_seller_id, p_escrow_id, p_seller_amount, v_phone, 'seller', 'pending', now() + interval '48 hours')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix create_delivery_payout (delivery_preference does not exist on delivery_persons/users)
CREATE OR REPLACE FUNCTION create_delivery_payout(p_order_id uuid, p_escrow_id uuid, p_delivery_person_id uuid, p_delivery_fee integer)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_phone text;
BEGIN
  -- Simply get the user_id and phone of the delivery person
  SELECT user_id, phone INTO v_user_id, v_phone
    FROM delivery_persons
    WHERE id = p_delivery_person_id;

  IF v_user_id IS NULL THEN RETURN; END IF;
  IF v_phone IS NULL THEN RETURN; END IF;

  INSERT INTO payouts (user_id, escrow_id, amount, recipient_phone, type, status, scheduled_for)
  VALUES (v_user_id, p_escrow_id, p_delivery_fee, v_phone, 'delivery', 'pending', now() + interval '24 hours')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure execute permissions
GRANT EXECUTE ON FUNCTION protect_listings_columns TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_order_payment TO authenticated;
GRANT EXECUTE ON FUNCTION create_seller_payout TO authenticated;
GRANT EXECUTE ON FUNCTION create_delivery_payout TO authenticated;
