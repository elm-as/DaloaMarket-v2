-- Migration: Leviers Psychologiques, Signaux d'Engagement Réels & Promotions Temporaires
-- Date: 2026-11-12

-- 1. Colonne d'expiration de promotion temporaire (FOMO / Flash Sale)
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS promo_ends_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_listings_promo_ends_at
  ON public.listings (promo_ends_at)
  WHERE promo_ends_at IS NOT NULL AND status = 'active';

-- 2. Table d'historique des baisses de prix (pour notifier les acheteurs ayant mis l'annonce en favori)
CREATE TABLE IF NOT EXISTS public.listing_price_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  old_price INTEGER NOT NULL,
  new_price INTEGER NOT NULL,
  dropped_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_price_drops_recent
  ON public.listing_price_drops (dropped_at DESC);

ALTER TABLE public.listing_price_drops ENABLE ROW LEVEL SECURITY;

-- Trigger automatique lors d'une baisse de prix d'au moins 100 FCFA
CREATE OR REPLACE FUNCTION public.log_listing_price_drop()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.price < OLD.price AND (OLD.price - NEW.price) >= 100 THEN
    INSERT INTO public.listing_price_drops (listing_id, old_price, new_price)
    VALUES (NEW.id, OLD.price, NEW.price);
    IF NEW.original_price IS NULL OR NEW.original_price < OLD.price THEN
      NEW.original_price := OLD.price;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_listing_price_drop ON public.listings;
CREATE TRIGGER trg_log_listing_price_drop
  BEFORE UPDATE OF price ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_listing_price_drop();

-- 3. Journal anti-spam des notifications comportementales (Frequency Cap)
CREATE TABLE IF NOT EXISTS public.push_nudge_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  nudge_key TEXT NOT NULL,
  ref_id TEXT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_nudge_log_user_recent
  ON public.push_nudge_log (user_id, sent_at DESC);

ALTER TABLE public.push_nudge_log ENABLE ROW LEVEL SECURITY;

-- 4. RPC: Signaux d'engagement réels sur une annonce (FOMO honnête)
CREATE OR REPLACE FUNCTION public.get_listing_engagement_signals(p_listing_id UUID)
RETURNS TABLE (
  recent_viewers_7d INTEGER,
  favorites_count INTEGER,
  stock INTEGER,
  price_drop_amount INTEGER,
  promo_ends_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    (
      SELECT count(*)::integer
      FROM public.listing_views v
      WHERE v.listing_id = l.id
        AND v.last_viewed_at > now() - interval '7 days'
        AND v.viewer_id::text IS DISTINCT FROM l.user_id::text
    ) AS recent_viewers_7d,
    (
      SELECT count(*)::integer
      FROM public.favorites f
      WHERE f.listing_id = l.id
    ) AS favorites_count,
    COALESCE(l.stock, 1)::integer AS stock,
    CASE
      WHEN l.original_price IS NOT NULL
        AND l.original_price > l.price
        AND (l.promo_ends_at IS NULL OR l.promo_ends_at > now())
      THEN (l.original_price - l.price)::integer
      ELSE 0
    END AS price_drop_amount,
    CASE
      WHEN l.promo_ends_at IS NOT NULL AND l.promo_ends_at > now()
      THEN l.promo_ends_at
      ELSE NULL
    END AS promo_ends_at
  FROM public.listings l
  WHERE l.id = p_listing_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_engagement_signals(UUID) TO anon, authenticated, service_role;

-- 5. RPC: Preuve sociale & communauté de la marketplace (Appartenance & Confiance)
CREATE OR REPLACE FUNCTION public.get_marketplace_proof_stats()
RETURNS TABLE (
  total_members INTEGER,
  active_listings INTEGER,
  new_listings_7d INTEGER,
  active_promos INTEGER,
  verified_reviews INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    (SELECT count(*)::integer FROM public.users WHERE banned IS NOT TRUE AND deleted_at IS NULL) AS total_members,
    (SELECT count(*)::integer FROM public.listings WHERE status = 'active') AS active_listings,
    (SELECT count(*)::integer FROM public.listings WHERE status = 'active' AND created_at > now() - interval '7 days') AS new_listings_7d,
    (
      SELECT count(*)::integer
      FROM public.listings
      WHERE status = 'active'
        AND original_price IS NOT NULL
        AND original_price > price
        AND (promo_ends_at IS NULL OR promo_ends_at > now())
    ) AS active_promos,
    (SELECT count(*)::integer FROM public.reviews) AS verified_reviews;
$$;

GRANT EXECUTE ON FUNCTION public.get_marketplace_proof_stats() TO anon, authenticated, service_role;

-- 6. RPC: Progression hebdomadaire du vendeur (Aspiration Avant / Après)
CREATE OR REPLACE FUNCTION public.get_my_weekly_seller_progress()
RETURNS TABLE (
  visitors_this_week INTEGER,
  visitors_prev_week INTEGER,
  favorites_this_week INTEGER,
  active_promos_count INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    (
      SELECT count(*)::integer
      FROM public.listing_views v
      JOIN public.listings l ON l.id = v.listing_id
      WHERE l.user_id = auth.uid()
        AND v.viewer_id::text IS DISTINCT FROM l.user_id::text
        AND v.last_viewed_at > now() - interval '7 days'
    ) AS visitors_this_week,
    (
      SELECT count(*)::integer
      FROM public.listing_views v
      JOIN public.listings l ON l.id = v.listing_id
      WHERE l.user_id = auth.uid()
        AND v.viewer_id::text IS DISTINCT FROM l.user_id::text
        AND v.last_viewed_at <= now() - interval '7 days'
        AND v.last_viewed_at > now() - interval '14 days'
    ) AS visitors_prev_week,
    (
      SELECT count(*)::integer
      FROM public.favorites f
      JOIN public.listings l ON l.id = f.listing_id
      WHERE l.user_id = auth.uid()
        AND f.created_at > now() - interval '7 days'
    ) AS favorites_this_week,
    (
      SELECT count(*)::integer
      FROM public.listings l
      WHERE l.user_id = auth.uid()
        AND l.status = 'active'
        AND l.original_price IS NOT NULL
        AND l.original_price > l.price
        AND (l.promo_ends_at IS NULL OR l.promo_ends_at > now())
    ) AS active_promos_count;
$$;

REVOKE ALL ON FUNCTION public.get_my_weekly_seller_progress() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_weekly_seller_progress() TO authenticated, service_role;

