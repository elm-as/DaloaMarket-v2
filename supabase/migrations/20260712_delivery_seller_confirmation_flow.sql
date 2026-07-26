-- Delivery flow: payment -> seller confirmation -> driver pickup -> delivery.

ALTER TABLE public.delivery_assignments
DROP CONSTRAINT IF EXISTS delivery_assignments_status_check;

ALTER TABLE public.delivery_assignments
ADD CONSTRAINT delivery_assignments_status_check
CHECK (
  status = ANY (
    ARRAY[
      'pending_seller_confirmation'::text,
      'awaiting_pickup'::text,
      'accepted'::text,
      'picked_up'::text,
      'in_transit'::text,
      'delivered'::text,
      'auto_released'::text,
      'disputed'::text,
      'cancelled'::text
    ]
  )
);

DROP POLICY IF EXISTS "delivery_assignments_select_available" ON public.delivery_assignments;
CREATE POLICY "delivery_assignments_select_available"
ON public.delivery_assignments
FOR SELECT
TO authenticated
USING (
  status = 'awaiting_pickup'
  AND delivery_person_id IS NULL
  AND EXISTS (
    SELECT 1 FROM delivery_persons dp
    WHERE dp.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION confirm_seller_availability(p_order_id uuid)
RETURNS json AS $$
DECLARE
  assignment_record RECORD;
BEGIN
  SELECT da.* INTO assignment_record
  FROM delivery_assignments da
  JOIN orders o ON o.id = da.order_id
  WHERE da.order_id = p_order_id
    AND o.seller_id = auth.uid()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'assignment_not_found');
  END IF;

  IF assignment_record.status != 'pending_seller_confirmation' THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'invalid_status',
      'current_status', assignment_record.status
    );
  END IF;

  UPDATE delivery_assignments
  SET
    status = 'awaiting_pickup',
    pickup_confirmed_by_seller = true,
    updated_at = now()
  WHERE id = assignment_record.id;

  RETURN json_build_object('success', true, 'status', 'awaiting_pickup');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cancel_order_unavailable(p_order_id uuid)
RETURNS json AS $$
DECLARE
  order_record RECORD;
BEGIN
  SELECT * INTO order_record
  FROM orders
  WHERE id = p_order_id
    AND seller_id = auth.uid();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'order_not_found');
  END IF;

  IF order_record.status NOT IN ('paid', 'pending') THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'invalid_status',
      'current_status', order_record.status
    );
  END IF;

  UPDATE orders
  SET status = 'cancelled'
  WHERE id = p_order_id;

  UPDATE delivery_assignments
  SET status = 'cancelled', updated_at = now()
  WHERE order_id = p_order_id
    AND status IN ('pending_seller_confirmation', 'awaiting_pickup');

  RETURN json_build_object('success', true, 'status', 'cancelled');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION accept_delivery_assignment(
  p_assignment_id uuid,
  p_delivery_person_id uuid
)
RETURNS json AS $$
BEGIN
  UPDATE delivery_assignments
  SET
    status = 'accepted',
    delivery_person_id = p_delivery_person_id,
    accepted_at = now(),
    updated_at = now()
  WHERE id = p_assignment_id
    AND status = 'awaiting_pickup'
    AND delivery_person_id IS NULL;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'assignment_unavailable');
  END IF;

  RETURN json_build_object('success', true, 'status', 'accepted');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION verify_pickup(
  p_assignment_id uuid,
  p_otp text,
  p_photo_url text,
  p_gps_lat numeric,
  p_gps_lng numeric
)
RETURNS json AS $$
DECLARE
  assignment RECORD;
  order_record RECORD;
  distance_m numeric;
BEGIN
  SELECT * INTO assignment
  FROM delivery_assignments
  WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'assignment_not_found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM delivery_persons dp
    WHERE dp.id = assignment.delivery_person_id
      AND dp.user_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  IF assignment.status != 'accepted' THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_status', 'current_status', assignment.status);
  END IF;

  IF assignment.pickup_confirmed_by_seller IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'reason', 'seller_not_confirmed');
  END IF;

  IF assignment.pickup_otp != p_otp THEN
    UPDATE delivery_assignments
    SET pickup_otp_attempts = pickup_otp_attempts + 1
    WHERE id = p_assignment_id;

    IF assignment.pickup_otp_attempts + 1 >= 3 THEN
      UPDATE delivery_assignments
      SET status = 'disputed', disputed_at = now(), dispute_reason = 'too_many_otp_attempts'
      WHERE id = p_assignment_id;

      RETURN json_build_object('success', false, 'reason', 'too_many_attempts', 'status', 'disputed');
    END IF;

    RETURN json_build_object('success', false, 'reason', 'invalid_otp', 'attempts', assignment.pickup_otp_attempts + 1, 'max_attempts', 3);
  END IF;

  IF p_photo_url IS NULL OR p_photo_url = '' THEN
    RETURN json_build_object('success', false, 'reason', 'photo_required');
  END IF;

  SELECT o.*, u.shop_latitude, u.shop_longitude INTO order_record
  FROM orders o
  JOIN users u ON u.id = o.seller_id
  WHERE o.id = assignment.order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'order_not_found');
  END IF;

  IF order_record.shop_latitude IS NULL OR order_record.shop_longitude IS NULL THEN
    distance_m := 0;
  ELSE
    distance_m := calculate_distance(p_gps_lat, p_gps_lng, order_record.shop_latitude, order_record.shop_longitude);
  END IF;

  IF distance_m > 100 THEN
    RETURN json_build_object('success', false, 'reason', 'gps_distance_exceeded', 'distance', distance_m, 'max_distance', 100);
  END IF;

  UPDATE delivery_assignments
  SET
    status = 'in_transit',
    pickup_confirmed_at = now(),
    pickup_photo_url = p_photo_url,
    pickup_gps = json_build_object('lat', p_gps_lat, 'lng', p_gps_lng),
    pickup_gps_distance_m = distance_m,
    updated_at = now()
  WHERE id = p_assignment_id;

  UPDATE orders
  SET status = 'in_transit'
  WHERE id = assignment.order_id;

  RETURN json_build_object('success', true, 'status', 'in_transit', 'distance_m', distance_m);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION verify_delivery(
  p_assignment_id uuid,
  p_otp text,
  p_photo_url text,
  p_gps_lat numeric,
  p_gps_lng numeric
)
RETURNS json AS $$
DECLARE
  assignment RECORD;
  order_record RECORD;
  distance_m numeric;
BEGIN
  SELECT * INTO assignment
  FROM delivery_assignments
  WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'assignment_not_found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM delivery_persons dp
    WHERE dp.id = assignment.delivery_person_id
      AND dp.user_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  IF assignment.status != 'in_transit' THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_status', 'current_status', assignment.status);
  END IF;

  IF assignment.buyer_confirmed_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'reason', 'already_confirmed');
  END IF;

  IF assignment.delivery_otp != p_otp THEN
    UPDATE delivery_assignments
    SET delivery_otp_attempts = delivery_otp_attempts + 1
    WHERE id = p_assignment_id;

    IF assignment.delivery_otp_attempts + 1 >= 3 THEN
      UPDATE delivery_assignments
      SET status = 'disputed', disputed_at = now(), dispute_reason = 'too_many_otp_attempts'
      WHERE id = p_assignment_id;

      RETURN json_build_object('success', false, 'reason', 'too_many_attempts', 'status', 'disputed');
    END IF;

    RETURN json_build_object('success', false, 'reason', 'invalid_otp', 'attempts', assignment.delivery_otp_attempts + 1, 'max_attempts', 3);
  END IF;

  IF p_photo_url IS NULL OR p_photo_url = '' THEN
    RETURN json_build_object('success', false, 'reason', 'photo_required');
  END IF;

  SELECT * INTO order_record
  FROM orders
  WHERE id = assignment.order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'order_not_found');
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

  RETURN json_build_object('success', true, 'status', 'delivered', 'distance_m', distance_m);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION confirm_seller_availability TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_order_unavailable TO authenticated;
GRANT EXECUTE ON FUNCTION accept_delivery_assignment TO authenticated;
GRANT EXECUTE ON FUNCTION verify_pickup TO authenticated;
GRANT EXECUTE ON FUNCTION verify_delivery TO authenticated;
