-- Fix verify_delivery_otp to ONLY verify the code, NOT update the status to 'delivered'
-- This ensures the frontend proceeds to the photo and GPS steps, and the final verify_delivery handles payouts.

CREATE OR REPLACE FUNCTION verify_delivery_otp(p_order_id uuid, p_code text)
RETURNS json AS $$
DECLARE
  v_assignment RECORD;
BEGIN
  SELECT * INTO v_assignment
  FROM delivery_assignments
  WHERE order_id = p_order_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'assignment_not_found');
  END IF;

  -- Vérifier que l'utilisateur est bien le livreur ou un admin
  IF NOT EXISTS (
    SELECT 1 FROM delivery_persons dp
    WHERE dp.id = v_assignment.delivery_person_id
    AND dp.user_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  IF v_assignment.status != 'in_transit' THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_status', 'current_status', v_assignment.status);
  END IF;

  IF v_assignment.delivery_otp != p_code THEN
    UPDATE delivery_assignments
    SET delivery_otp_attempts = delivery_otp_attempts + 1
    WHERE id = v_assignment.id;

    IF v_assignment.delivery_otp_attempts + 1 >= 5 THEN
      UPDATE delivery_assignments
      SET status = 'disputed', disputed_at = now(), dispute_reason = 'too_many_otp_attempts'
      WHERE id = v_assignment.id;
      
      RETURN json_build_object('success', false, 'reason', 'locked', 'status', 'disputed');
    END IF;

    RETURN json_build_object(
      'success', false, 
      'reason', 'invalid_otp', 
      'attempts', v_assignment.delivery_otp_attempts + 1,
      'max_attempts', 5
    );
  END IF;

  -- The OTP is valid. DO NOT mark as delivered here! 
  -- The final step (verify_delivery) will handle status change and payouts.
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION verify_delivery_otp TO authenticated;
