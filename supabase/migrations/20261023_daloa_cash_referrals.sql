-- ============================================================================
-- Migration: F10 — Parrainage Daloa Cash (Crédits Livraison Client-à-Client)
-- Date: 2026-10-23
-- ============================================================================

-- 1. Colonnes sur public.users et public.orders
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS daloa_cash_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referred_by_code text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS daloa_cash_discount integer NOT NULL DEFAULT 0;

-- 2. Table des parrainages (daloa_cash_referrals)
CREATE TABLE IF NOT EXISTS public.daloa_cash_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  referee_reward_amount integer NOT NULL DEFAULT 500,
  referrer_reward_amount integer NOT NULL DEFAULT 500,
  first_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_daloa_cash_referee UNIQUE (referee_id),
  CONSTRAINT chk_no_self_referral CHECK (referrer_id <> referee_id)
);

ALTER TABLE public.daloa_cash_referrals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_daloa_cash_ref_referrer ON public.daloa_cash_referrals(referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daloa_cash_ref_referee ON public.daloa_cash_referrals(referee_id);

DROP POLICY IF EXISTS daloa_cash_ref_select ON public.daloa_cash_referrals;
CREATE POLICY daloa_cash_ref_select ON public.daloa_cash_referrals
  FOR SELECT TO authenticated
  USING (
    referrer_id = auth.uid() OR referee_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND LOWER(u.role) IN ('admin', 'superadmin'))
  );

-- 3. Table du journal comptable Daloa Cash (daloa_cash_transactions)
CREATE TABLE IF NOT EXISTS public.daloa_cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN (
    'referral_bonus_referee', 'referral_bonus_referrer', 'checkout_discount', 'checkout_refund', 'admin_adjustment'
  )),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  referral_id uuid REFERENCES public.daloa_cash_referrals(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daloa_cash_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_daloa_cash_tx_user ON public.daloa_cash_transactions(user_id, created_at DESC);

DROP POLICY IF EXISTS daloa_cash_tx_select ON public.daloa_cash_transactions;
CREATE POLICY daloa_cash_tx_select ON public.daloa_cash_transactions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND LOWER(u.role) IN ('admin', 'superadmin'))
  );

-- 4. Générateur de code de parrainage unique
CREATE OR REPLACE FUNCTION public.fn_generate_user_referral_code(p_full_name text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_clean text; v_code text; v_exists boolean;
  v_chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_rnd text; v_i int;
BEGIN
  v_clean := UPPER(REGEXP_REPLACE(COALESCE(p_full_name, 'DALOA'), '[^A-Za-z]', '', 'g'));
  IF LENGTH(v_clean) < 3 THEN v_clean := 'DALOA'; ELSE v_clean := SUBSTRING(v_clean FROM 1 FOR 5); END IF;
  LOOP
    v_rnd := '';
    FOR v_i IN 1..4 LOOP v_rnd := v_rnd || SUBSTR(v_chars, FLOOR(RANDOM() * LENGTH(v_chars) + 1)::int, 1); END LOOP;
    v_code := v_clean || '-' || v_rnd;
    SELECT EXISTS(SELECT 1 FROM public.users WHERE referral_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_user_referral_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
  IF NEW.referral_code IS NULL OR TRIM(NEW.referral_code) = '' THEN
    NEW.referral_code := public.fn_generate_user_referral_code(NEW.full_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_user_referral_code ON public.users;
CREATE TRIGGER trg_set_user_referral_code
  BEFORE INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_set_user_referral_code();

-- Remplissage des codes manquants
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, full_name FROM public.users WHERE referral_code IS NULL LOOP
    UPDATE public.users SET referral_code = public.fn_generate_user_referral_code(r.full_name) WHERE id = r.id;
  END LOOP;
END;
$$;

-- 5. RPC apply_referral_code (Application d'un code parrainage)
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_code text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE
  v_buyer_id uuid := auth.uid();
  v_clean_code text := UPPER(TRIM(COALESCE(p_code, '')));
  v_referrer record; v_already boolean; v_has_orders boolean;
  v_ref_id uuid; v_bonus int := 500;
BEGIN
  IF v_buyer_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Vous devez être connecté.');
  END IF;
  IF v_clean_code = '' THEN
    RETURN json_build_object('success', false, 'message', 'Code de parrainage manquant.');
  END IF;

  SELECT id, full_name, referral_code INTO v_referrer FROM public.users WHERE UPPER(referral_code) = v_clean_code;
  IF v_referrer.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Code de parrainage introuvable ou invalide.');
  END IF;
  IF v_referrer.id = v_buyer_id THEN
    RETURN json_build_object('success', false, 'message', 'Vous ne pouvez pas utiliser votre propre code.');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.daloa_cash_referrals WHERE referee_id = v_buyer_id) INTO v_already;
  IF v_already THEN
    RETURN json_build_object('success', false, 'message', 'Vous avez déjà utilisé un code de parrainage.');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.orders WHERE buyer_id = v_buyer_id AND status IN ('delivered', 'completed')) INTO v_has_orders;
  IF v_has_orders THEN
    RETURN json_build_object('success', false, 'message', 'Le parrainage de bienvenue est réservé aux nouveaux acheteurs.');
  END IF;

  INSERT INTO public.daloa_cash_referrals (referrer_id, referee_id, referral_code, status, referee_reward_amount, referrer_reward_amount)
  VALUES (v_referrer.id, v_buyer_id, v_referrer.referral_code, 'pending', v_bonus, v_bonus) RETURNING id INTO v_ref_id;

  UPDATE public.users SET daloa_cash_balance = daloa_cash_balance + v_bonus, referred_by_user_id = v_referrer.id, referred_by_code = v_referrer.referral_code WHERE id = v_buyer_id;

  INSERT INTO public.daloa_cash_transactions (user_id, amount, type, referral_id, notes)
  VALUES (v_buyer_id, v_bonus, 'referral_bonus_referee', v_ref_id, 'Cadeau de bienvenue parrainage (500 FCFA déductibles sur livraison)');

  RETURN json_build_object('success', true, 'message', 'Félicitations ! 500 FCFA ont été crédités sur votre compte Daloa Cash.', 'bonus_amount', v_bonus, 'referrer_name', COALESCE(v_referrer.full_name, 'Votre parrain'));
END;
$$;
REVOKE ALL ON FUNCTION public.apply_referral_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(text) TO authenticated;

-- 6. Trigger de récompense du parrain lors de la 1ère commande livrée
CREATE OR REPLACE FUNCTION public.fn_reward_referrer_on_first_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE
  v_ref record; v_other_count int; v_bonus int;
BEGIN
  IF NEW.status IN ('delivered', 'completed') AND (OLD.status IS NULL OR OLD.status NOT IN ('delivered', 'completed')) THEN
    SELECT * INTO v_ref FROM public.daloa_cash_referrals WHERE referee_id = NEW.buyer_id AND status = 'pending' LIMIT 1;
    IF v_ref.id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_other_count FROM public.orders WHERE buyer_id = NEW.buyer_id AND status IN ('delivered', 'completed') AND id <> NEW.id;
      IF v_other_count = 0 THEN
        v_bonus := COALESCE(v_ref.referrer_reward_amount, 500);
        UPDATE public.daloa_cash_referrals SET status = 'completed', first_order_id = NEW.id, rewarded_at = now() WHERE id = v_ref.id;
        UPDATE public.users SET daloa_cash_balance = daloa_cash_balance + v_bonus WHERE id = v_ref.referrer_id;
        INSERT INTO public.daloa_cash_transactions (user_id, amount, type, order_id, referral_id, notes)
        VALUES (v_ref.referrer_id, v_bonus, 'referral_bonus_referrer', NEW.id, v_ref.id, 'Bonus parrainage : Première commande livrée de votre filleul');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reward_referrer_on_delivery ON public.orders;
CREATE TRIGGER trg_reward_referrer_on_delivery
  AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.fn_reward_referrer_on_first_delivery();

-- 7. Trigger de remboursement Daloa Cash en cas d'annulation de commande
CREATE OR REPLACE FUNCTION public.fn_refund_daloa_cash_on_order_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status <> 'cancelled') AND COALESCE(OLD.daloa_cash_discount, 0) > 0 THEN
    UPDATE public.users SET daloa_cash_balance = daloa_cash_balance + OLD.daloa_cash_discount WHERE id = OLD.buyer_id;
    INSERT INTO public.daloa_cash_transactions (user_id, amount, type, order_id, notes)
    VALUES (OLD.buyer_id, OLD.daloa_cash_discount, 'checkout_refund', OLD.id, 'Remboursement Daloa Cash suite à l''annulation de votre commande');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refund_daloa_cash_on_cancel ON public.orders;
CREATE TRIGGER trg_refund_daloa_cash_on_cancel
  AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.fn_refund_daloa_cash_on_order_cancel();

-- 8. RPC atomique apply_daloa_cash_to_order (Déduction Daloa Cash au checkout)
CREATE OR REPLACE FUNCTION public.apply_daloa_cash_to_order(p_order_id uuid, p_discount integer)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE
  v_buyer_id uuid := auth.uid();
  v_order record; v_user_balance int; v_actual_discount int;
BEGIN
  IF v_buyer_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Non authentifié.');
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id AND buyer_id = v_buyer_id;
  IF v_order.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Commande introuvable.');
  END IF;
  SELECT daloa_cash_balance INTO v_user_balance FROM public.users WHERE id = v_buyer_id FOR UPDATE;
  IF COALESCE(v_user_balance, 0) <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Solde Daloa Cash insuffisant.');
  END IF;
  v_actual_discount := LEAST(v_user_balance, v_order.delivery_fee, p_discount);
  IF v_actual_discount <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Aucune réduction applicable.');
  END IF;
  UPDATE public.users SET daloa_cash_balance = daloa_cash_balance - v_actual_discount WHERE id = v_buyer_id;
  UPDATE public.orders SET daloa_cash_discount = v_actual_discount, total_amount = GREATEST(0, total_amount - v_actual_discount) WHERE id = p_order_id;
  INSERT INTO public.daloa_cash_transactions (user_id, amount, type, order_id, notes)
  VALUES (v_buyer_id, -v_actual_discount, 'checkout_discount', p_order_id, 'Réduction Daloa Cash appliquée au checkout');
  RETURN json_build_object('success', true, 'discount_applied', v_actual_discount, 'new_balance', v_user_balance - v_actual_discount);
END;
$$;
REVOKE ALL ON FUNCTION public.apply_daloa_cash_to_order(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_daloa_cash_to_order(uuid, integer) TO authenticated;
