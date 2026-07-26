-- Fonction RPC pour vérifier le pickup avec toutes les contraintes de sécurité
-- Cette fonction remplace les vérifications côté client pour garantir l'application des règles
-- Date: 7 juillet 2026

-- D'abord, créer la fonction utilitaire de calcul de distance GPS (Haversine)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 numeric,
  lon1 numeric,
  lat2 numeric,
  lon2 numeric
)
RETURNS numeric AS $$
DECLARE
  R numeric := 6371000; -- Rayon de la Terre en mètres
  dLat numeric;
  dLon numeric;
  a numeric;
  c numeric;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);
  
  a := sin(dLat / 2) * sin(dLat / 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      sin(dLon / 2) * sin(dLon / 2);
      
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  
  RETURN R * c; -- Distance en mètres
END;
$$ LANGUAGE plpgsql;

-- Fonction principale de vérification pickup
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
  -- Récupérer l'assignment
  SELECT * INTO assignment
  FROM delivery_assignments
  WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'assignment_not_found');
  END IF;

  -- Vérifier que le caller est bien le livreur assigné
  IF NOT EXISTS (
    SELECT 1 FROM delivery_persons dp
    WHERE dp.id = assignment.delivery_person_id
    AND dp.user_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  -- Vérifier que le statut est 'accepted'
  IF assignment.status != 'accepted' THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_status', 'current_status', assignment.status);
  END IF;

  -- Vérifier que le pickup n'est pas déjà confirmé
  IF assignment.pickup_confirmed_by_seller = true THEN
    RETURN json_build_object('success', false, 'reason', 'already_confirmed');
  END IF;

  -- Vérifier OTP
  IF assignment.pickup_otp != p_otp THEN
    -- Incrémenter le compteur de tentatives
    UPDATE delivery_assignments
    SET pickup_otp_attempts = pickup_otp_attempts + 1
    WHERE id = p_assignment_id;

    -- Si trop de tentatives, passer en disputed
    IF assignment.pickup_otp_attempts + 1 >= 3 THEN
      UPDATE delivery_assignments
      SET 
        status = 'disputed',
        disputed_at = now(),
        dispute_reason = 'too_many_otp_attempts'
      WHERE id = p_assignment_id;
      
      RETURN json_build_object('success', false, 'reason', 'too_many_attempts', 'status', 'disputed');
    END IF;

    RETURN json_build_object(
      'success', false, 
      'reason', 'invalid_otp', 
      'attempts', assignment.pickup_otp_attempts + 1,
      'max_attempts', 3
    );
  END IF;

  -- Vérifier photo (obligatoire)
  IF p_photo_url IS NULL OR p_photo_url = '' THEN
    RETURN json_build_object('success', false, 'reason', 'photo_required');
  END IF;

  -- Récupérer les infos de la commande et du vendeur
  SELECT o.*, u.shop_latitude, u.shop_longitude INTO order_record
  FROM orders o
  JOIN users u ON u.id = o.seller_id
  WHERE o.id = assignment.order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'order_not_found');
  END IF;

  -- Vérifier que le vendeur a des coordonnées GPS
  IF order_record.shop_latitude IS NULL OR order_record.shop_longitude IS NULL THEN
    -- Si pas de GPS vendeur, accepter sans vérification de distance
    distance_m := 0;
  ELSE
    -- Calculer distance GPS
    distance_m := calculate_distance(p_gps_lat, p_gps_lng, order_record.shop_latitude, order_record.shop_longitude);
  END IF;

  -- Vérifier distance GPS (max 100m)
  IF distance_m > 100 THEN
    RETURN json_build_object(
      'success', false, 
      'reason', 'gps_distance_exceeded', 
      'distance', distance_m,
      'max_distance', 100
    );
  END IF;

  -- Tout est OK, mettre à jour l'assignment
  UPDATE delivery_assignments
  SET
    status = 'picked_up',
    pickup_photo_url = p_photo_url,
    pickup_gps = json_build_object('lat', p_gps_lat, 'lng', p_gps_lng),
    pickup_gps_distance_m = distance_m,
    updated_at = now()
  WHERE id = p_assignment_id;

  RETURN json_build_object(
    'success', true,
    'status', 'picked_up',
    'distance_m', distance_m
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution à authenticated
GRANT EXECUTE ON FUNCTION verify_pickup TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_distance TO authenticated;

-- Fonction principale de vérification delivery
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
  -- Récupérer l'assignment
  SELECT * INTO assignment
  FROM delivery_assignments
  WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'assignment_not_found');
  END IF;

  -- Vérifier que le caller est bien le livreur assigné
  IF NOT EXISTS (
    SELECT 1 FROM delivery_persons dp
    WHERE dp.id = assignment.delivery_person_id
    AND dp.user_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  -- Vérifier que le statut est 'in_transit'
  IF assignment.status != 'in_transit' THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_status', 'current_status', assignment.status);
  END IF;

  -- Vérifier que la delivery n'est pas déjà confirmée
  IF assignment.buyer_confirmed_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'reason', 'already_confirmed');
  END IF;

  -- Vérifier OTP delivery
  IF assignment.delivery_otp != p_otp THEN
    -- Incrémenter le compteur de tentatives
    UPDATE delivery_assignments
    SET delivery_otp_attempts = delivery_otp_attempts + 1
    WHERE id = p_assignment_id;

    -- Si trop de tentatives, passer en disputed
    IF assignment.delivery_otp_attempts + 1 >= 3 THEN
      UPDATE delivery_assignments
      SET 
        status = 'disputed',
        disputed_at = now(),
        dispute_reason = 'too_many_otp_attempts'
      WHERE id = p_assignment_id;
      
      RETURN json_build_object('success', false, 'reason', 'too_many_attempts', 'status', 'disputed');
    END IF;

    RETURN json_build_object(
      'success', false, 
      'reason', 'invalid_otp', 
      'attempts', assignment.delivery_otp_attempts + 1,
      'max_attempts', 3
    );
  END IF;

  -- Vérifier photo (obligatoire)
  IF p_photo_url IS NULL OR p_photo_url = '' THEN
    RETURN json_build_object('success', false, 'reason', 'photo_required');
  END IF;

  -- Récupérer les infos de la commande
  SELECT * INTO order_record
  FROM orders
  WHERE id = assignment.order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'order_not_found');
  END IF;

  -- Vérifier que l'acheteur a des coordonnées GPS
  IF order_record.delivery_lat IS NULL OR order_record.delivery_lng IS NULL THEN
    -- Si pas de GPS acheteur, accepter sans vérification de distance
    distance_m := 0;
  ELSE
    -- Calculer distance GPS
    distance_m := calculate_distance(p_gps_lat, p_gps_lng, order_record.delivery_lat, order_record.delivery_lng);
  END IF;

  -- Vérifier distance GPS (max 100m)
  IF distance_m > 100 THEN
    RETURN json_build_object(
      'success', false, 
      'reason', 'gps_distance_exceeded', 
      'distance', distance_m,
      'max_distance', 100
    );
  END IF;

  -- Tout est OK, mettre à jour l'assignment
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

  RETURN json_build_object(
    'success', true,
    'status', 'delivered',
    'distance_m', distance_m
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution à authenticated
GRANT EXECUTE ON FUNCTION verify_delivery TO authenticated;
