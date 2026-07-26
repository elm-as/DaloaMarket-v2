-- Migration: Add one-time free boost logic
-- Date: 2026-07-19

-- 1. Add pro_free_boost_used column to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pro_free_boost_used boolean DEFAULT false;

-- 2. Update confirm_seller_badge to reset pro_free_boost_used
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

  -- Mettre à jour pro_until de l'utilisateur ET réinitialiser le boost gratuit
  UPDATE public.users
  SET 
    pro_until = CASE
      WHEN pro_until IS NULL OR pro_until < now() THEN now() + (v_days || ' days')::interval
      ELSE pro_until + (v_days || ' days')::interval
    END,
    pro_free_boost_used = false
  WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update free_boost_listing to check and consume the free boost
CREATE OR REPLACE FUNCTION free_boost_listing(p_listing_id uuid)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_is_pro boolean;
  v_pro_free_boost_used boolean;
  v_pro_boost_duration interval := interval '2 days';
  v_new_boosted_until timestamp with time zone;
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

  -- Vérifier si l'utilisateur est Pro et s'il a déjà utilisé son boost gratuit
  SELECT 
    (pro_until IS NOT NULL AND pro_until > now()), 
    COALESCE(pro_free_boost_used, false)
  INTO v_is_pro, v_pro_free_boost_used
  FROM public.users
  WHERE id = v_user_id;

  IF NOT v_is_pro THEN
    RETURN json_build_object('success', false, 'reason', 'not_pro_user');
  END IF;

  IF v_pro_free_boost_used THEN
    RETURN json_build_object('success', false, 'reason', 'already_used_free_boost');
  END IF;

  -- Appliquer le boost
  UPDATE public.listings
  SET boosted_until = CASE 
    WHEN boosted_until IS NULL OR boosted_until < now() THEN now() + v_pro_boost_duration
    ELSE boosted_until + v_pro_boost_duration
  END
  WHERE id = p_listing_id
  RETURNING boosted_until INTO v_new_boosted_until;

  -- Marquer le boost gratuit comme utilisé
  UPDATE public.users
  SET pro_free_boost_used = true
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'boosted_until', v_new_boosted_until);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
