-- Migration: Credit boosts and pro free boost duration adjustment
-- Date: 2026-07-17

-- 1. Update free_boost_listing to 2 days (48h) duration instead of 7 days
CREATE OR REPLACE FUNCTION free_boost_listing(p_listing_id uuid)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_is_pro boolean;
  v_active_boost_count integer;
  v_paid_boost_count integer;
  v_pro_boost_duration interval := interval '2 days';
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

  -- Compter le nombre de listings de cet utilisateur qui sont actuellement boostés par le biais du slot Pro gratuit (sans transaction payante associée dans les 2 derniers jours)
  SELECT count(*) INTO v_active_boost_count
  FROM public.listings
  WHERE user_id = v_user_id
    AND boosted_until > now()
    AND status = 'active';

  -- Compter le nombre de transactions de boost confirmées récemment (2 derniers jours) ou achetées via crédit
  -- (pour ne pas bloquer le slot gratuit si l'utilisateur a payé un boost en plus)
  SELECT count(*) INTO v_paid_boost_count
  FROM public.monetization_transactions
  WHERE user_id = v_user_id
    AND type = 'boost'
    AND status = 'confirmed'
    AND created_at > now() - interval '2 days';

  -- Si le nombre de boosts actifs moins les boosts payants récents est >= 1, ils ont déjà utilisé leur boost gratuit Pro
  IF (v_active_boost_count - v_paid_boost_count) >= 1 THEN
    RETURN json_build_object('success', false, 'reason', 'already_boosted');
  END IF;

  -- Appliquer le boost gratuit de 2 jours (48h)
  UPDATE public.listings
  SET boosted_until = now() + v_pro_boost_duration
  WHERE id = p_listing_id;

  RETURN json_build_object('success', true, 'boosted_until', now() + v_pro_boost_duration);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Create function to purchase a boost using credits
CREATE OR REPLACE FUNCTION buy_boost_with_credits(p_listing_id uuid, p_duration_days integer)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_credits integer;
  v_cost integer;
  v_boosted_until timestamp with time zone;
BEGIN
  -- Récupérer l'utilisateur propriétaire de la listing
  SELECT user_id INTO v_user_id
  FROM public.listings
  WHERE id = p_listing_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'listing_not_found');
  END IF;

  -- Vérifier que l'appelant est le propriétaire de la listing
  IF auth.uid() != v_user_id THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  -- Déterminer le coût en crédits selon la durée demandée
  -- 1 jour (24h) = 1 crédit
  -- 2 jours (48h) = 2 crédits
  -- 7 jours (1 semaine) = 5 crédits (offre spéciale)
  IF p_duration_days = 1 THEN
    v_cost := 1;
  ELSIF p_duration_days = 2 THEN
    v_cost := 2;
  ELSIF p_duration_days = 7 THEN
    v_cost := 5;
  ELSE
    RETURN json_build_object('success', false, 'reason', 'invalid_duration');
  END IF;

  -- Récupérer le solde de crédits de l'utilisateur
  SELECT COALESCE(listing_credits, 0) INTO v_credits
  FROM public.users
  WHERE id = v_user_id;

  -- Vérifier s'il a assez de crédits
  IF v_credits < v_cost THEN
    RETURN json_build_object('success', false, 'reason', 'insufficient_credits', 'cost', v_cost, 'balance', v_credits);
  END IF;

  -- Déduire les crédits
  UPDATE public.users
  SET listing_credits = listing_credits - v_cost
  WHERE id = v_user_id;

  -- Appliquer le boost
  UPDATE public.listings
  SET boosted_until = CASE
    WHEN boosted_until IS NULL OR boosted_until < now() THEN now() + (p_duration_days || ' days')::interval
    ELSE boosted_until + (p_duration_days || ' days')::interval
  END
  WHERE id = p_listing_id
  RETURNING boosted_until INTO v_boosted_until;

  -- Enregistrer une transaction interne de type 'boost_credit' dans monetization_transactions pour l'historique
  INSERT INTO public.monetization_transactions (
    user_id,
    type,
    amount,
    status,
    metadata
  ) VALUES (
    v_user_id,
    'boost',
    0, -- montant financier 0 car payé en crédits
    'confirmed',
    jsonb_build_object('listing_id', p_listing_id, 'payment_method', 'credits', 'credits_used', v_cost, 'duration_days', p_duration_days)
  );

  RETURN json_build_object(
    'success', true,
    'boosted_until', v_boosted_until,
    'cost', v_cost,
    'new_balance', (v_credits - v_cost)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
