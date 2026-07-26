-- 1. Modification of confirm_seller_availability to accept 'pending' as a valid status.
CREATE OR REPLACE FUNCTION confirm_seller_availability(
  p_order_id uuid
)
RETURNS json AS $$
DECLARE
  assignment_record RECORD;
BEGIN
  -- First check if order belongs to seller
  IF NOT EXISTS (SELECT 1 FROM orders WHERE id = p_order_id AND seller_id = auth.uid()) THEN
    RETURN json_build_object('success', false, 'reason', 'order_not_found_or_unauthorized');
  END IF;

  -- Get the assignment
  SELECT da.* INTO assignment_record
  FROM delivery_assignments da
  WHERE da.order_id = p_order_id
  LIMIT 1;

  IF NOT FOUND THEN
    -- Auto-create the assignment for legacy orders that don't have one
    INSERT INTO delivery_assignments (
      order_id,
      status,
      pickup_confirmed_by_seller,
      pickup_confirmed_at,
      pickup_otp,
      delivery_otp
    )
    SELECT
      id,
      'awaiting_pickup',
      true,
      now(),
      lpad(floor(random() * 1000000)::text, 6, '0'),
      lpad(floor(random() * 1000000)::text, 6, '0')
    FROM orders
    WHERE id = p_order_id
    RETURNING * INTO assignment_record;

    RETURN json_build_object('success', true);
  END IF;

  -- Allow both pending_seller_confirmation and pending (for legacy compatibility)
  IF assignment_record.status NOT IN ('pending_seller_confirmation', 'pending') THEN
    RETURN json_build_object(
      'success', false, 
      'reason', 'invalid_status', 
      'current_status', assignment_record.status
    );
  END IF;

  -- Verify it hasn't been confirmed yet
  IF assignment_record.pickup_confirmed_by_seller THEN
    RETURN json_build_object('success', false, 'reason', 'already_confirmed');
  END IF;

  -- Update the assignment
  UPDATE delivery_assignments
  SET 
    status = 'awaiting_pickup',
    pickup_confirmed_by_seller = true,
    pickup_confirmed_at = now()
  WHERE id = assignment_record.id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
