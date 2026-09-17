-- ============================================================================
-- MIGRATION: Déblocage Chaîne Livraison, Suppression Blocage GPS & Sécurisation Triggers
-- Date: 2026-09-17
-- ============================================================================

-- 1. Réparation du trigger protect_delivery_assignments_columns
-- Suppression définitive des colonnes fantômes (delivery_address, delivery_lat, delivery_lng)
-- qui causaient l'erreur Postgres 42703 (400 Bad Request) lors de l'annulation et de l'acceptation.
CREATE OR REPLACE FUNCTION public.protect_delivery_assignments_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Écriture hors API cliente directe : RPC SECURITY DEFINER de l'app, pg_cron, migration,
  -- service_role. Ces chemins sont déjà contrôlés par leur propre logique métier.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF is_admin_or_service_role() THEN
    RETURN NEW;
  END IF;

  -- L'acheteur est autorisé à modifier uniquement buyer_confirmed_at
  IF NOT public.da_caller_is_order_buyer(OLD.order_id) THEN
    NEW.buyer_confirmed_at = OLD.buyer_confirmed_at;
  END IF;

  -- Restaurer les colonnes réelles existantes sur delivery_assignments
  NEW.id = OLD.id;
  NEW.order_id = OLD.order_id;
  NEW.status = OLD.status;
  NEW.delivery_person_id = OLD.delivery_person_id;
  NEW.pickup_confirmed_by_seller = OLD.pickup_confirmed_by_seller;
  NEW.pickup_confirmed_at = OLD.pickup_confirmed_at;
  NEW.pickup_otp = OLD.pickup_otp;
  NEW.delivery_otp = OLD.delivery_otp;
  NEW.pickup_otp_attempts = OLD.pickup_otp_attempts;
  NEW.delivery_otp_attempts = OLD.delivery_otp_attempts;
  NEW.accepted_at = OLD.accepted_at;
  NEW.pickup_gps = OLD.pickup_gps;
  NEW.pickup_gps_distance_m = OLD.pickup_gps_distance_m;
  NEW.delivery_gps = OLD.delivery_gps;
  NEW.delivery_gps_distance_m = OLD.delivery_gps_distance_m;
  NEW.pickup_photo_url = OLD.pickup_photo_url;
  NEW.delivery_photo_url = OLD.delivery_photo_url;
  NEW.delivered_at = OLD.delivered_at;
  NEW.auto_released_at = OLD.auto_released_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Retrait du blocage GPS dans verify_pickup (maintien du calcul & archivage pour audit)
CREATE OR REPLACE FUNCTION public.verify_pickup(
  p_assignment_id uuid,
  p_otp text,
  p_photo_url text,
  p_gps_lat numeric DEFAULT NULL,
  p_gps_lng numeric DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  assignment RECORD;
  order_record RECORD;
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

  -- Pas de vérification bloquante de distance GPS à la récupération
  UPDATE delivery_assignments
  SET
    status = 'in_transit',
    pickup_confirmed_at = now(),
    pickup_photo_url = p_photo_url,
    pickup_gps = CASE WHEN p_gps_lat IS NOT NULL THEN json_build_object('lat', p_gps_lat, 'lng', p_gps_lng) ELSE NULL END,
    pickup_gps_distance_m = 0,
    updated_at = now()
  WHERE id = p_assignment_id;

  UPDATE orders
  SET status = 'in_transit'
  WHERE id = assignment.order_id;

  RETURN json_build_object('success', true, 'status', 'in_transit');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Retrait du blocage GPS dans verify_delivery & Déclenchement automatique des payouts
CREATE OR REPLACE FUNCTION public.verify_delivery(
  p_assignment_id uuid,
  p_otp text,
  p_photo_url text,
  p_gps_lat numeric DEFAULT NULL,
  p_gps_lng numeric DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  assignment       RECORD;
  order_record     RECORD;
  distance_m       numeric;
  v_transaction_id uuid;
  v_seller_amount  integer;
  v_attempts       integer;
BEGIN
  SELECT * INTO assignment FROM delivery_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'assignment_not_found');
  END IF;

  IF NOT (EXISTS (SELECT 1 FROM delivery_persons dp
                   WHERE dp.id = assignment.delivery_person_id
                     AND dp.user_id = auth.uid())
          OR is_admin_or_service_role()) THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  SELECT * INTO order_record FROM orders WHERE id = assignment.order_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'order_not_found');
  END IF;
  IF order_record.status <> 'in_transit' THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_order_status');
  END IF;

  IF COALESCE(assignment.delivery_otp, '') <> COALESCE(p_otp, '') THEN
    v_attempts := COALESCE(assignment.delivery_otp_attempts, 0) + 1;
    UPDATE delivery_assignments
       SET delivery_otp_attempts = v_attempts, updated_at = now()
     WHERE id = p_assignment_id;

    IF v_attempts >= 5 THEN
      UPDATE delivery_assignments
         SET status = 'disputed', disputed_at = now(),
             dispute_reason = 'too_many_otp_attempts', updated_at = now()
       WHERE id = p_assignment_id;
      RETURN json_build_object('success', false, 'reason', 'too_many_attempts',
                               'status', 'disputed');
    END IF;

    RETURN json_build_object('success', false, 'reason', 'invalid_otp',
                             'attempts', v_attempts, 'max_attempts', 5);
  END IF;

  -- Distance conservée à titre indicatif : elle n'empêche plus la validation
  IF order_record.delivery_lat IS NULL OR order_record.delivery_lng IS NULL
     OR p_gps_lat IS NULL OR p_gps_lng IS NULL THEN
    distance_m := NULL;
  ELSE
    distance_m := calculate_distance(p_gps_lat, p_gps_lng,
                                     order_record.delivery_lat, order_record.delivery_lng);
  END IF;

  UPDATE delivery_assignments
     SET status = 'delivered',
         delivery_photo_url = p_photo_url,
         delivery_gps = CASE WHEN p_gps_lat IS NOT NULL
                             THEN json_build_object('lat', p_gps_lat, 'lng', p_gps_lng)
                             ELSE NULL END,
         delivery_gps_distance_m = distance_m,
         delivered_at = now(), buyer_confirmed_at = now(), updated_at = now()
   WHERE id = p_assignment_id;

  UPDATE orders SET status = 'delivered' WHERE id = assignment.order_id;

  SELECT id, seller_amount INTO v_transaction_id, v_seller_amount
    FROM escrow_transactions WHERE order_id = assignment.order_id LIMIT 1;

  IF v_transaction_id IS NOT NULL THEN
    -- Paiement en ligne : virements automatiques
    PERFORM create_seller_payout(assignment.order_id, v_transaction_id,
                                 order_record.seller_id, v_seller_amount);
    PERFORM create_delivery_payout(assignment.order_id, v_transaction_id,
                                   assignment.delivery_person_id, order_record.delivery_fee);
  ELSE
    -- Espèces : rien à reverser, on enregistre la créance de la plateforme
    PERFORM record_cod_receivable(assignment.order_id);
  END IF;

  RETURN json_build_object('success', true, 'status', 'delivered',
                           'distance_m', distance_m);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
