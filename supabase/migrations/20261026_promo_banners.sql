-- ============================================================================
-- Migration: 20261026_promo_banners.sql
-- Description: Table pour les affiches promotionnelles et bannières d'accueil
--              gérées par l'administration (institutionnelles et payantes)
--              et réservées aux Vendeurs Pro certifiés.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.promo_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text NOT NULL,
  badge_text text DEFAULT 'SPONSORISÉ',
  badge_color text DEFAULT '#FF9800',
  link_type text NOT NULL CHECK (link_type IN ('listing', 'seller', 'express', 'referral', 'external', 'none')),
  link_target text, -- ID de l'annonce, du profil vendeur, ou URL
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  seller_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  sponsor_name text,
  price_paid integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,
  clicks_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Colonnes additionnelles au cas où la table a déjà été créée sans elles
ALTER TABLE public.promo_banners ADD COLUMN IF NOT EXISTS sponsor_name text;
ALTER TABLE public.promo_banners ADD COLUMN IF NOT EXISTS price_paid integer DEFAULT 0;

-- Index pour requêtes rapides de l'accueil
CREATE INDEX IF NOT EXISTS idx_promo_banners_active 
  ON public.promo_banners(is_active, priority DESC, created_at DESC)
  WHERE is_active = true;

-- Sécurité RLS
ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

-- 1. Lecture publique pour les bannières actives dans leur période de validité
DROP POLICY IF EXISTS "Public read active banners" ON public.promo_banners;
CREATE POLICY "Public read active banners" ON public.promo_banners
  FOR SELECT USING (
    is_active = true 
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

-- 2. Gestion complète réservée aux administrateurs
DROP POLICY IF EXISTS "Admins manage banners" ON public.promo_banners;
CREATE POLICY "Admins manage banners" ON public.promo_banners
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- 3. Lecture de ses propres bannières par le vendeur
DROP POLICY IF EXISTS "Sellers read own banners" ON public.promo_banners;
CREATE POLICY "Sellers read own banners" ON public.promo_banners
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid());

-- 4. Soumission d'une affiche réservée aux Vendeurs Pro actifs (pro_until > now())
DROP POLICY IF EXISTS "Pro sellers create banner" ON public.promo_banners;
CREATE POLICY "Pro sellers create banner" ON public.promo_banners
  FOR INSERT TO authenticated
  WITH CHECK (
    seller_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND pro_until IS NOT NULL 
        AND pro_until > now()
    )
  );

-- 5. Modification de sa propre affiche par le Vendeur Pro
DROP POLICY IF EXISTS "Pro sellers update own pending banners" ON public.promo_banners;
CREATE POLICY "Pro sellers update own pending banners" ON public.promo_banners
  FOR UPDATE TO authenticated
  USING (
    seller_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND pro_until IS NOT NULL 
        AND pro_until > now()
    )
  );

-- Données initiales d'accueil DaloaMarket
INSERT INTO public.promo_banners (title, subtitle, image_url, badge_text, badge_color, link_type, link_target, priority)
VALUES 
  (
    'Coursier Express Daloa',
    'Envoi direct de colis, plis et repas entre quartiers en 30 min dès 500 F',
    'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=1200&q=80',
    'NOUVEAU',
    '#FF9800',
    'express',
    NULL,
    10
  ),
  (
    'Programme Daloa Cash',
    'Gagnez 500 FCFA pour chaque ami invité sur l''application',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80',
    'BON PLAN',
    '#16A34A',
    'referral',
    NULL,
    5
  )
ON CONFLICT DO NOTHING;
