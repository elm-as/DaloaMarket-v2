-- ============================================================================
-- MIGRATION V2 : SYSTÈME DE CODES PROMO AU CHECKOUT
-- Permet d'appliquer une réduction (montant fixe FCFA ou %) au checkout final,
-- avec conditions optionnelles (montant minimum, paiement en ligne uniquement,
-- limite d'utilisation globale et 1 fois par utilisateur).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percent')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  max_discount_amount numeric DEFAULT NULL,
  min_order_amount numeric NOT NULL DEFAULT 0,
  online_only boolean NOT NULL DEFAULT false,
  max_uses integer DEFAULT NULL,
  uses_count integer NOT NULL DEFAULT 0,
  per_user_limit integer NOT NULL DEFAULT 1,
  starts_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promo_code_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_applied numeric NOT NULL DEFAULT 0,
  used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code_upper ON public.promo_codes (UPPER(code));
CREATE INDEX IF NOT EXISTS idx_promo_code_usages_user ON public.promo_code_usages (promo_code_id, user_id);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique des codes promo actifs" ON public.promo_codes;
CREATE POLICY "Lecture publique des codes promo actifs"
  ON public.promo_codes FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Lecture de ses propres utilisations promo" ON public.promo_code_usages;
CREATE POLICY "Lecture de ses propres utilisations promo"
  ON public.promo_code_usages FOR SELECT
  USING (auth.uid() = user_id);

-- RPC de validation d'un code promo au checkout
CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_code text,
  p_order_subtotal numeric,
  p_payment_method text DEFAULT 'online'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_promo public.promo_codes%ROWTYPE;
  v_user_uses integer := 0;
  v_discount numeric := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Connectez-vous pour utiliser un code promo.');
  END IF;

  SELECT *
    INTO v_promo
    FROM public.promo_codes
   WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_code))
     AND is_active = true
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Code promo invalide ou expiré.');
  END IF;

  IF v_promo.starts_at IS NOT NULL AND v_promo.starts_at > now() THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Ce code promo n’est pas encore actif.');
  END IF;

  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Ce code promo a expiré.');
  END IF;

  IF v_promo.max_uses IS NOT NULL AND v_promo.uses_count >= v_promo.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Ce code promo a atteint sa limite d’utilisation.');
  END IF;

  IF v_promo.online_only AND p_payment_method <> 'online' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Ce code promo est valable uniquement avec le paiement Mobile Money en ligne.'
    );
  END IF;

  IF p_order_subtotal < v_promo.min_order_amount THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', format('Commande minimum de %s FCFA requise pour ce code.', v_promo.min_order_amount::bigint)
    );
  END IF;

  SELECT COUNT(*)
    INTO v_user_uses
    FROM public.promo_code_usages
   WHERE promo_code_id = v_promo.id
     AND user_id = v_user_id;

  IF v_promo.per_user_limit IS NOT NULL AND v_user_uses >= v_promo.per_user_limit THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Vous avez déjà utilisé ce code promo.');
  END IF;

  IF v_promo.discount_type = 'percent' THEN
    v_discount := ROUND((p_order_subtotal * v_promo.discount_value) / 100.0);
    IF v_promo.max_discount_amount IS NOT NULL AND v_discount > v_promo.max_discount_amount THEN
      v_discount := v_promo.max_discount_amount;
    END IF;
  ELSE
    v_discount := v_promo.discount_value;
  END IF;

  v_discount := LEAST(v_discount, p_order_subtotal);

  RETURN jsonb_build_object(
    'valid', true,
    'code', UPPER(TRIM(v_promo.code)),
    'promo_id', v_promo.id,
    'discount_type', v_promo.discount_type,
    'discount_value', v_promo.discount_value,
    'discount_amount', v_discount,
    'online_only', v_promo.online_only,
    'min_order_amount', v_promo.min_order_amount,
    'description', v_promo.description
  );
END;
$$;

