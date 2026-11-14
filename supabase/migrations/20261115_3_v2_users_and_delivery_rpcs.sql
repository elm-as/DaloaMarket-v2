-- ============================================================================
-- Migration : 20261115_2_v2_users_protection_and_cod_order.sql (Lot 2/2 V2)
-- 1. Arrondi frais livraison (x50 FCFA) + vérifications livreurs & stops groupés.
-- 2. Colonnes Anti-Lapin / is_test_user + GRANT SELECT + protect_users_columns
--    SANS aucune colonne DaloaCash (daloa_cash_balance / referral_code absents).
-- 3. create_cod_order unifiée (11 paramètres, défauts rétrocompatibles V1 9-param,
--    préserve is_test_user Google Reviewers, reserve_fee = 0, tournées groupées).
-- ============================================================================

-- 1. Arrondi officiel des frais de livraison au multiple de 50 FCFA
CREATE OR REPLACE FUNCTION public.fn_delivery_fee(p_km numeric)
RETURNS integer LANGUAGE sql IMMUTABLE
AS $$
  SELECT (round((500 + CASE
    WHEN COALESCE(p_km, 0) > 1.5 THEN (p_km - 1.5) * 85
    ELSE 0
  END) / 50.0) * 50)::integer;
$$;

-- 2. Colonnes V2 requises sur public.users + droits de lecture sans DaloaCash
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_test_user boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_test_users boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS referred_by_code text,
  ADD COLUMN IF NOT EXISTS cod_orders_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cod_delivered_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cod_refused_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cod_reliability_score numeric NOT NULL DEFAULT 100.0,
  ADD COLUMN IF NOT EXISTS cod_warning_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cod_blocked_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_cod_refusal_at timestamptz;

GRANT SELECT (
  cod_orders_count, cod_delivered_count, cod_refused_count,
  cod_reliability_score, cod_warning_count, cod_blocked_until, last_cod_refusal_at
) ON public.users TO anon, authenticated;

GRANT SELECT (referred_by_code) ON public.users TO authenticated;

-- 3. Protection des colonnes sensibles V1 + V2 sur public.users (SANS DaloaCash)
CREATE OR REPLACE FUNCTION public.protect_users_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_caller_role text;
BEGIN
  IF OLD.role = 'superadmin' THEN
    IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') AND auth.uid() IS NOT NULL THEN
      SELECT LOWER(role) INTO v_caller_role FROM public.users WHERE id = auth.uid();
      IF v_caller_role IS NULL OR v_caller_role != 'superadmin' THEN
        RAISE EXCEPTION 'Seul un SuperAdmin peut modifier ou bannir un compte SuperAdmin.';
      END IF;
    END IF;
  END IF;

  IF current_setting('app.bypass_user_protection', true) = 'on' OR is_admin_or_service_role() THEN
    RETURN NEW;
  END IF;

  NEW.role := OLD.role;
  NEW.banned := OLD.banned;
  NEW.ban_reason := OLD.ban_reason;
  NEW.pro_until := OLD.pro_until;
  NEW.rating := OLD.rating;
  NEW.first_listing_at := OLD.first_listing_at;
  NEW.is_test_user := OLD.is_test_user;
  NEW.is_test_users := OLD.is_test_users;
  NEW.referred_by_code := OLD.referred_by_code;

  NEW.cod_orders_count := OLD.cod_orders_count;
  NEW.cod_delivered_count := OLD.cod_delivered_count;
  NEW.cod_refused_count := OLD.cod_refused_count;
  NEW.cod_reliability_score := OLD.cod_reliability_score;
  NEW.cod_warning_count := OLD.cod_warning_count;
  NEW.cod_blocked_until := OLD.cod_blocked_until;
  NEW.last_cod_refusal_at := OLD.last_cod_refusal_at;

  RETURN NEW;
END;
$$;

-- 4. Unification DaloaDelivery V1 & V2 (is_verified + OTP + tournées groupées)
CREATE OR REPLACE FUNCTION public.accept_delivery_assignment(
  p_assignment_id uuid,
  p_delivery_person_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_dp uuid; v_is_verified boolean; v_assign record; v_group_id uuid;
BEGIN
  SELECT id, is_verified INTO v_dp, v_is_verified FROM public.delivery_persons WHERE user_id = auth.uid();
  IF v_dp IS NULL THEN RETURN json_build_object('success', false, 'reason', 'not_a_delivery_person'); END IF;
  IF NOT COALESCE(v_is_verified, false) THEN
    RETURN json_build_object('success', false, 'reason', 'driver_not_verified',
      'message', 'Votre dossier livreur doit être validé par un administrateur avant de pouvoir accepter des courses.');
  END IF;

  SELECT da.*, o.delivery_mode AS order_delivery_mode, o.seller_id AS order_seller_id
    INTO v_assign FROM public.delivery_assignments da JOIN public.orders o ON o.id = da.order_id
   WHERE da.id = p_assignment_id;
  IF NOT FOUND OR v_assign.order_delivery_mode <> 'delivery' THEN
    RETURN json_build_object('success', false, 'reason', 'assignment_unavailable');
  END IF;

  IF v_assign.is_private IS TRUE AND NOT EXISTS (
    SELECT 1 FROM public.seller_delivery_affiliations sda
     WHERE sda.delivery_person_id = v_dp AND sda.seller_id = v_assign.order_seller_id AND sda.status = 'active'
  ) THEN
    RETURN json_build_object('success', false, 'reason', 'not_affiliated');
  END IF;

  UPDATE public.delivery_assignments
     SET status = 'accepted', delivery_person_id = v_dp, accepted_at = now(), updated_at = now()
   WHERE id = p_assignment_id AND status = 'awaiting_pickup' AND delivery_person_id IS NULL;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'reason', 'assignment_unavailable'); END IF;

  v_group_id := v_assign.delivery_group_id;
  IF v_group_id IS NOT NULL THEN
    UPDATE public.delivery_assignments
       SET status = 'accepted', delivery_person_id = v_dp, accepted_at = now(), updated_at = now()
     WHERE delivery_group_id = v_group_id AND id <> p_assignment_id AND delivery_person_id IS NULL;
    UPDATE public.delivery_group_runs
       SET status = 'accepted', delivery_person_id = v_dp, updated_at = now()
     WHERE id = v_group_id;
  END IF;
  RETURN json_build_object('success', true, 'status', 'accepted');
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_delivery_assignment(uuid, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.verify_delivery(uuid, text, text, numeric, numeric);
DROP FUNCTION IF EXISTS public.verify_delivery(uuid, text, text, double precision, double precision);

CREATE OR REPLACE FUNCTION public.verify_delivery(
  p_assignment_id uuid, p_otp text, p_photo_url text,
  p_gps_lat double precision DEFAULT NULL, p_gps_lng double precision DEFAULT NULL
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  assignment RECORD; order_record RECORD; sibling RECORD;
  distance_m numeric; v_transaction_id uuid; v_seller_amount integer;
  v_attempts integer; v_requires_otp boolean; v_group_id uuid;
BEGIN
  SELECT * INTO assignment FROM public.delivery_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'reason', 'assignment_not_found'); END IF;
  IF NOT (EXISTS (SELECT 1 FROM public.delivery_persons dp WHERE dp.id = assignment.delivery_person_id AND dp.user_id = auth.uid()) OR is_admin_or_service_role()) THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized');
  END IF;
  SELECT * INTO order_record FROM public.orders WHERE id = assignment.order_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'reason', 'order_not_found'); END IF;
  IF order_record.status NOT IN ('in_transit', 'picked_up') THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_order_status');
  END IF;

  v_requires_otp := COALESCE(assignment.is_express, false)
    OR COALESCE(order_record.payment_method, 'online') NOT IN ('cod', 'cash', 'cash_at_shop');
  IF v_requires_otp AND COALESCE(assignment.delivery_otp, '') <> COALESCE(TRIM(p_otp), '') THEN
    v_attempts := COALESCE(assignment.delivery_otp_attempts, 0) + 1;
    UPDATE public.delivery_assignments SET delivery_otp_attempts = v_attempts, updated_at = now() WHERE id = p_assignment_id;
    IF v_attempts >= 5 THEN
      UPDATE public.delivery_assignments SET status = 'disputed', disputed_at = now(), dispute_reason = 'too_many_otp_attempts', updated_at = now() WHERE id = p_assignment_id;
      RETURN json_build_object('success', false, 'reason', 'too_many_attempts', 'status', 'disputed');
    END IF;
    RETURN json_build_object('success', false, 'reason', 'invalid_otp', 'attempts', v_attempts, 'max_attempts', 5);
  END IF;

  distance_m := CASE WHEN order_record.delivery_lat IS NULL OR order_record.delivery_lng IS NULL OR p_gps_lat IS NULL OR p_gps_lng IS NULL THEN NULL
    ELSE calculate_distance(p_gps_lat::numeric, p_gps_lng::numeric, order_record.delivery_lat::numeric, order_record.delivery_lng::numeric) END;

  PERFORM set_config('app.OrderUpdateAuthorized', 'true', true);
  UPDATE public.delivery_assignments
     SET status = 'delivered', delivery_photo_url = p_photo_url,
         delivery_gps = CASE WHEN p_gps_lat IS NOT NULL THEN json_build_object('lat', p_gps_lat, 'lng', p_gps_lng) ELSE NULL END,
         delivery_gps_distance_m = distance_m, delivered_at = now(), buyer_confirmed_at = now(), updated_at = now()
   WHERE id = p_assignment_id;
  UPDATE public.orders SET status = 'delivered', updated_at = now() WHERE id = assignment.order_id;

  SELECT id, seller_amount INTO v_transaction_id, v_seller_amount FROM public.escrow_transactions WHERE order_id = assignment.order_id LIMIT 1;
  IF v_transaction_id IS NOT NULL AND COALESCE(order_record.payment_method, 'online') = 'online' THEN
    PERFORM create_seller_payout(assignment.order_id, v_transaction_id, order_record.seller_id, v_seller_amount);
    PERFORM create_delivery_payout(assignment.order_id, v_transaction_id, assignment.delivery_person_id, order_record.delivery_fee);
  END IF;

  v_group_id := assignment.delivery_group_id;
  IF v_group_id IS NOT NULL THEN
    FOR sibling IN
      SELECT da.id AS assign_id, da.order_id, da.delivery_person_id, o.seller_id, o.delivery_fee, o.payment_method
        FROM public.delivery_assignments da JOIN public.orders o ON o.id = da.order_id
       WHERE da.delivery_group_id = v_group_id AND da.id <> p_assignment_id AND da.status <> 'delivered'
    LOOP
      UPDATE public.delivery_assignments SET status = 'delivered', delivery_photo_url = p_photo_url, delivered_at = now(), buyer_confirmed_at = now(), updated_at = now() WHERE id = sibling.assign_id;
      UPDATE public.orders SET status = 'delivered', updated_at = now() WHERE id = sibling.order_id;
      SELECT id, seller_amount INTO v_transaction_id, v_seller_amount FROM public.escrow_transactions WHERE order_id = sibling.order_id LIMIT 1;
      IF v_transaction_id IS NOT NULL AND COALESCE(sibling.payment_method, 'online') = 'online' THEN
        PERFORM create_seller_payout(sibling.order_id, v_transaction_id, sibling.seller_id, v_seller_amount);
        PERFORM create_delivery_payout(sibling.order_id, v_transaction_id, sibling.delivery_person_id, sibling.delivery_fee);
      END IF;
    END LOOP;
    UPDATE public.delivery_group_runs SET status = 'delivered', updated_at = now() WHERE id = v_group_id;
  END IF;

  RETURN json_build_object('success', true, 'status', 'delivered', 'distance_m', distance_m);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_delivery(uuid, text, text, double precision, double precision) TO authenticated;

DROP FUNCTION IF EXISTS public.confirm_grouped_pickup_stop(uuid, integer, uuid, text);
DROP FUNCTION IF EXISTS public.confirm_grouped_pickup_stop(uuid, integer, uuid, text, text);

CREATE OR REPLACE FUNCTION public.confirm_grouped_pickup_stop(
  p_assignment_id uuid, p_stop_index integer, p_seller_id uuid,
  p_notes text DEFAULT NULL, p_otp_code text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid(); v_driver_id uuid; v_assign record; v_group_id uuid;
  v_expected_otp text; v_stops jsonb; v_updated_stops jsonb := '[]'::jsonb; v_stop jsonb;
  v_new_completed integer := 0; v_total_stops integer := 1; v_all_completed boolean := false; v_next_status text;
BEGIN
  IF v_caller_id IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'unauthenticated'); END IF;
  SELECT id INTO v_driver_id FROM public.delivery_persons WHERE user_id = v_caller_id;
  IF v_driver_id IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'driver_not_found'); END IF;
  SELECT * INTO v_assign FROM public.delivery_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'reason', 'assignment_not_found'); END IF;
  IF v_assign.delivery_person_id IS DISTINCT FROM v_driver_id THEN RETURN jsonb_build_object('success', false, 'reason', 'unauthorized'); END IF;

  v_group_id := v_assign.delivery_group_id;
  IF p_otp_code IS NOT NULL AND length(trim(p_otp_code)) > 0 THEN
    SELECT da.pickup_otp INTO v_expected_otp FROM public.delivery_assignments da JOIN public.orders o ON o.id = da.order_id
     WHERE ((v_group_id IS NOT NULL AND da.delivery_group_id = v_group_id) OR da.id = p_assignment_id)
       AND o.seller_id = p_seller_id LIMIT 1;
    IF v_expected_otp IS NOT NULL AND trim(v_expected_otp) <> trim(p_otp_code) THEN
      RETURN jsonb_build_object('success', false, 'reason', 'invalid_otp', 'error', 'Code de collecte invalide pour cette boutique.');
    END IF;
  END IF;

  v_stops := COALESCE(v_assign.grouped_stops, '[]'::jsonb);
  v_total_stops := GREATEST(1, COALESCE(v_assign.group_total_stops, jsonb_array_length(v_stops)));
  FOR v_stop IN SELECT * FROM jsonb_array_elements(v_stops) LOOP
    IF COALESCE((v_stop->>'stop_index')::integer, 0) = p_stop_index OR (p_seller_id IS NOT NULL AND (v_stop->>'seller_id')::uuid = p_seller_id) THEN
      v_updated_stops := v_updated_stops || (v_stop || jsonb_build_object('status', 'picked_up', 'picked_up_at', now(), 'notes', p_notes));
      v_new_completed := v_new_completed + 1;
    ELSE
      v_updated_stops := v_updated_stops || v_stop;
      IF (v_stop->>'status') = 'picked_up' THEN v_new_completed := v_new_completed + 1; END IF;
    END IF;
  END LOOP;

  v_all_completed := (v_new_completed >= v_total_stops);
  v_next_status := CASE WHEN v_all_completed THEN 'in_transit' ELSE 'picked_up' END;
  PERFORM set_config('app.OrderUpdateAuthorized', 'true', true);

  IF v_group_id IS NOT NULL THEN
    UPDATE public.delivery_assignments SET group_completed_stops = v_new_completed, grouped_stops = v_updated_stops, status = v_next_status,
           pickup_confirmed_at = COALESCE(pickup_confirmed_at, now()), updated_at = now() WHERE delivery_group_id = v_group_id;
    UPDATE public.orders SET status = 'in_transit', updated_at = now()
     WHERE delivery_group_id = v_group_id AND seller_id = p_seller_id AND status NOT IN ('in_transit', 'delivered', 'cancelled');
  ELSE
    UPDATE public.delivery_assignments SET group_completed_stops = v_new_completed, grouped_stops = v_updated_stops, status = v_next_status,
           pickup_confirmed_at = COALESCE(pickup_confirmed_at, now()), updated_at = now() WHERE id = p_assignment_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'stop_index', p_stop_index, 'completed_stops', v_new_completed,
    'total_stops', v_total_stops, 'all_completed', v_all_completed, 'all_picked_up', v_all_completed, 'new_status', v_next_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_grouped_pickup_stop(uuid, integer, uuid, text, text) TO authenticated;
