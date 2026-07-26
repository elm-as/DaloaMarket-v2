-- Migration: Update confirm_seller_badge and add free_boost_listing
-- Date: 2026-07-17
-- Description: Supports yearly pro seller badge activations (365 days) and free boost function for pro sellers.

-- 1. confirm_seller_badge
CREATE OR REPLACE FUNCTION confirm_seller_badge(p_transaction_id uuid)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_amount integer;
  v_days integer;
BEGIN
  -- Lire les infos de la transaction
  SELECT user_id, amount INTO v_user_id, v_amount
  FROM public.monetization_transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction introuvable';
  END IF;

  -- Déterminer la durée en jours selon le montant (10 000 = annuel, sinon mensuel)
  IF v_amount >= 10000 THEN
    v_days := 365;
  ELSE
    v_days := 30;
  END IF;

  -- Mettre à jour pro_until de l'utilisateur
  UPDATE public.users
  SET pro_until = CASE
    WHEN pro_until IS NULL OR pro_until < now() THEN now() + (v_days || ' days')::interval
    ELSE pro_until + (v_days || ' days')::interval
  END
  WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. free_boost_listing
CREATE OR REPLACE FUNCTION free_boost_listing(p_listing_id uuid)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_is_pro boolean;
  v_active_boost_count integer;
  v_paid_boost_count integer;
BEGIN
  -- Récupérer l'utilisateur propriétaire de la listing
  SELECT user_id INTO v_user_id
  FROM public.listings
  WHERE id = p_listing_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'listing_not_found');
  END IF;

  -- Vérifier que l'appelant est bien le propriétaire de la listing
  IF auth.uid() != v_user_id THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  -- Vérifier si l'utilisateur est PRO
  SELECT COALESCE(pro_until > now(), false) INTO v_is_pro
  FROM public.users
  WHERE id = v_user_id;

  IF NOT v_is_pro THEN
    RETURN json_build_object('success', false, 'reason', 'not_pro');
  END IF;

  -- Compter le nombre de listings de cet utilisateur qui sont actuellement boostés
  SELECT count(*) INTO v_active_boost_count
  FROM public.listings
  WHERE user_id = v_user_id
    AND boosted_until > now()
    AND status = 'active';

  -- Compter le nombre de transactions de boost payées et confirmées dans les 7 derniers jours par cet utilisateur
  SELECT count(*) INTO v_paid_boost_count
  FROM public.monetization_transactions
  WHERE user_id = v_user_id
    AND type = 'boost'
    AND status = 'confirmed'
    AND created_at > now() - interval '7 days';

  -- Si le nombre de boosts actifs moins les boosts payés est >= 1, ils ont déjà utilisé leur boost gratuit
  IF (v_active_boost_count - v_paid_boost_count) >= 1 THEN
    RETURN json_build_object('success', false, 'reason', 'already_boosted');
  END IF;

  -- Appliquer le boost gratuit de 7 jours
  UPDATE public.listings
  SET boosted_until = now() + interval '7 days'
  WHERE id = p_listing_id;

  RETURN json_build_object('success', true, 'boosted_until', now() + interval '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
