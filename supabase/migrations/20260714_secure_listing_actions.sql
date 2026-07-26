-- Migration: Actions sécurisées sur les annonces et OTP simplifié
-- Date: 2026-07-14

-- 1. Marquer une annonce comme vendue de façon sécurisée
CREATE OR REPLACE FUNCTION mark_listing_as_sold(p_listing_id uuid)
RETURNS json AS $$
DECLARE
  v_listing RECORD;
BEGIN
  -- Vérifier l'existence et la propriété
  SELECT * INTO v_listing FROM listings WHERE id = p_listing_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'listing_not_found');
  END IF;

  IF v_listing.user_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  -- Mettre à jour en contournant le trigger (puisque SECURITY DEFINER s'exécute avec les droits postgres)
  UPDATE listings SET status = 'sold' WHERE id = p_listing_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Supprimer une annonce de façon sécurisée
CREATE OR REPLACE FUNCTION delete_listing_secure(p_listing_id uuid)
RETURNS json AS $$
DECLARE
  v_listing RECORD;
BEGIN
  SELECT * INTO v_listing FROM listings WHERE id = p_listing_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'listing_not_found');
  END IF;

  IF v_listing.user_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  UPDATE listings SET status = 'deleted' WHERE id = p_listing_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Version simplifiée de verify_delivery_otp (sans photo/GPS) pour s'aligner avec le frontend actuel
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
    -- Fallback si ce n'est pas le livreur, on peut aussi autoriser l'acheteur à confirmer ?
    -- L'interface "OrderTrackingPage" pour un acheteur permet de confirmer la réception via `.update()`, 
    -- mais ici verify_delivery_otp est utilisé par le livreur pour taper le code de l'acheteur.
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

  -- Code OK, marquer comme livré
  UPDATE delivery_assignments
  SET
    status = 'delivered',
    delivered_at = now(),
    updated_at = now()
  WHERE id = v_assignment.id;

  UPDATE orders
  SET status = 'delivered'
  WHERE id = v_assignment.order_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_listing_as_sold TO authenticated;
GRANT EXECUTE ON FUNCTION delete_listing_secure TO authenticated;
GRANT EXECUTE ON FUNCTION verify_delivery_otp TO authenticated;
