-- ============================================================================
-- Migration: 20261030_v2_users_grants_and_grouped_rpc.sql
-- Objectifs :
-- 1. Accorder SELECT sur les colonnes publiques V2 de public.users (42501 fix).
-- 2. Verrouiller daloa_cash_balance, referral_code et cod_* dans protect_users_columns().
-- 3. Créer la RPC SECURITY DEFINER setup_grouped_delivery_run (F06).
-- 4. Propager l'acceptation livreur à toute la tournée groupée dans accept_delivery_assignment.
-- ============================================================================

-- 1. Droits de lecture sur les colonnes V2 de public.users
GRANT SELECT (
  cod_orders_count,
  cod_delivered_count,
  cod_refused_count,
  cod_reliability_score,
  cod_warning_count,
  cod_blocked_until,
  last_cod_refusal_at,
  daloa_cash_balance,
  referral_code
) ON public.users TO anon, authenticated;

GRANT SELECT (
  referred_by_user_id,
  referred_by_code
) ON public.users TO authenticated;

-- 2. Protection des colonnes sensibles V1 + V2 sur public.users
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

  -- Colonnes V1
  NEW.role := OLD.role;
  NEW.banned := OLD.banned;
  NEW.ban_reason := OLD.ban_reason;
  NEW.pro_until := OLD.pro_until;
  NEW.rating := OLD.rating;
  NEW.first_listing_at := OLD.first_listing_at;

  -- Colonnes V2 (Daloa Cash & Parrainage F10)
  NEW.daloa_cash_balance := OLD.daloa_cash_balance;
  NEW.referral_code := OLD.referral_code;
  NEW.referred_by_user_id := OLD.referred_by_user_id;
  NEW.referred_by_code := OLD.referred_by_code;

  -- Colonnes V2 (Indice Anti-Lapin F02)
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

-- 3. RPC atomique setup_grouped_delivery_run (F06)
CREATE OR REPLACE FUNCTION public.setup_grouped_delivery_run(
  p_order_ids        uuid[],
  p_dropoff_address  text,
  p_dropoff_district text DEFAULT NULL,
  p_dropoff_lat      double precision DEFAULT NULL,
  p_dropoff_lng      double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_caller_id       uuid := auth.uid();
  v_buyer_id        uuid;
  v_group_id        uuid;
  v_existing_group  uuid;
  v_rec             record;
  v_idx             integer := 0;
  v_fees            numeric[] := '{}';
  v_quote           jsonb;
  v_grouped_total   numeric;
  v_savings         numeric;
  v_stops           jsonb := '[]'::jsonb;
  v_primary_order   uuid := NULL;
  v_new_fee         integer;
  v_discount        integer;
BEGIN
  IF p_order_ids IS NULL OR cardinality(p_order_ids) <= 1 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_enough_orders');
  END IF;

  SELECT buyer_id, delivery_group_id
    INTO v_buyer_id, v_existing_group
    FROM public.orders
   WHERE id = p_order_ids[1];

  IF v_buyer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'orders_not_found');
  END IF;

  IF v_caller_id IS NOT NULL AND v_caller_id <> v_buyer_id AND NOT is_admin_or_service_role() THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  IF v_existing_group IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'group_id', v_existing_group, 'already_grouped', true);
  END IF;

  v_group_id := gen_random_uuid();
  PERFORM set_config('app.OrderUpdateAuthorized', 'true', true);

  FOR v_rec IN
    SELECT o.id AS order_id, o.seller_id, COALESCE(o.delivery_fee, 500)::numeric AS delivery_fee,
           u.shop_name, u.full_name, u.district, u.shop_latitude, u.shop_longitude, u.phone
      FROM public.orders o
      LEFT JOIN public.users u ON u.id = o.seller_id
     WHERE o.id = ANY(p_order_ids)
       AND o.buyer_id = v_buyer_id
     ORDER BY COALESCE(o.delivery_fee, 500) DESC, o.created_at ASC
  LOOP
    v_idx := v_idx + 1;
    v_fees := v_fees || v_rec.delivery_fee;

    IF v_idx = 1 THEN
      v_primary_order := v_rec.order_id;
      v_new_fee := v_rec.delivery_fee::integer;
      v_discount := 0;
    ELSE
      v_new_fee := LEAST(v_rec.delivery_fee::integer, 300);
      v_discount := GREATEST(0, v_rec.delivery_fee::integer - v_new_fee);
    END IF;

    v_stops := v_stops || jsonb_build_object(
      'stop_index', v_idx,
      'seller_id', v_rec.seller_id,
      'shop_name', COALESCE(v_rec.shop_name, v_rec.full_name, 'Boutique'),
      'address', COALESCE(v_rec.district, 'Daloa'),
      'district', v_rec.district,
      'latitude', v_rec.shop_latitude,
      'longitude', v_rec.shop_longitude,
      'phone', v_rec.phone,
      'status', 'pending'
    );

    UPDATE public.orders
       SET delivery_group_id = v_group_id,
           is_grouped = true,
           grouped_stop_index = v_idx,
           delivery_fee = v_new_fee,
           grouped_delivery_discount = v_discount,
           total_amount = GREATEST(0, product_amount + v_new_fee + COALESCE(reserve_fee, 0) - COALESCE(daloa_cash_discount, 0)),
           updated_at = now()
     WHERE id = v_rec.order_id;
  END LOOP;

  IF v_idx <= 1 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_enough_valid_orders');
  END IF;

  v_quote := public.fn_calculate_grouped_delivery_quote(v_fees, 300);
  v_grouped_total := COALESCE((v_quote->>'total_grouped_fee')::numeric, 500);
  v_savings := COALESCE((v_quote->>'savings')::numeric, 0);

  UPDATE public.delivery_assignments
     SET delivery_group_id = v_group_id,
         is_grouped = true,
         group_total_stops = v_idx,
         group_completed_stops = 0,
         grouped_stops = v_stops,
         delivery_price = CASE WHEN order_id = v_primary_order THEN v_grouped_total ELSE 300 END,
         updated_at = now()
   WHERE order_id = ANY(p_order_ids);

  INSERT INTO public.delivery_group_runs (
    id, buyer_id, total_sellers, status, total_delivery_price,
    driver_earning, platform_fee, buyer_discount,
    dropoff_address, dropoff_district, dropoff_lat, dropoff_lng
  ) VALUES (
    v_group_id, v_buyer_id, v_idx, 'awaiting_pickup', v_grouped_total,
    ROUND(v_grouped_total * 0.90), ROUND(v_grouped_total * 0.10), v_savings,
    COALESCE(NULLIF(TRIM(p_dropoff_address), ''), 'Daloa'),
    p_dropoff_district, p_dropoff_lat, p_dropoff_lng
  );

  RETURN jsonb_build_object(
    'success', true,
    'group_id', v_group_id,
    'total_stops', v_idx,
    'total_grouped_fee', v_grouped_total,
    'savings', v_savings
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.setup_grouped_delivery_run(uuid[], text, text, double precision, double precision) TO authenticated;

-- 4. Mise à jour de accept_delivery_assignment pour lier toute la tournée groupée
CREATE OR REPLACE FUNCTION public.accept_delivery_assignment(p_assignment_id uuid, p_delivery_person_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_dp     uuid;
  v_assign record;
BEGIN
  SELECT id INTO v_dp FROM public.delivery_persons WHERE user_id = auth.uid();
  IF v_dp IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'not_a_delivery_person');
  END IF;

  SELECT da.*, o.delivery_mode AS order_delivery_mode
    INTO v_assign
    FROM public.delivery_assignments da
    JOIN public.orders o ON o.id = da.order_id
   WHERE da.id = p_assignment_id;

  IF NOT FOUND OR v_assign.order_delivery_mode <> 'delivery' THEN
    RETURN json_build_object('success', false, 'reason', 'assignment_unavailable');
  END IF;

  IF v_assign.is_private IS TRUE AND NOT EXISTS (
    SELECT 1 FROM public.seller_delivery_affiliations sda
     WHERE sda.delivery_person_id = v_dp
       AND sda.seller_id = v_assign.seller_id
       AND sda.status = 'active'
  ) THEN
    RETURN json_build_object('success', false, 'reason', 'not_affiliated');
  END IF;

  UPDATE public.delivery_assignments
     SET status = 'accepted', delivery_person_id = v_dp,
         accepted_at = now(), updated_at = now()
   WHERE id = p_assignment_id
     AND status = 'awaiting_pickup'
     AND delivery_person_id IS NULL;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'assignment_unavailable');
  END IF;

  IF v_assign.delivery_group_id IS NOT NULL THEN
    UPDATE public.delivery_assignments
       SET status = 'accepted', delivery_person_id = v_dp,
           accepted_at = now(), updated_at = now()
     WHERE delivery_group_id = v_assign.delivery_group_id
       AND id <> p_assignment_id
       AND delivery_person_id IS NULL;

    UPDATE public.delivery_group_runs
       SET status = 'accepted', delivery_person_id = v_dp, updated_at = now()
     WHERE id = v_assign.delivery_group_id;
  END IF;

  RETURN json_build_object('success', true, 'status', 'accepted');
END;
$$;
