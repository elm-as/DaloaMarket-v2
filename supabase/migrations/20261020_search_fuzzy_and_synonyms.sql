-- Migration : Index Trigramme & Recherche Intelligente (F05)
-- Date : 20 octobre 2026
-- Objectif : Optimiser les performances de recherche textuelle avec pg_trgm
-- et index GIN sur le titre et la description des annonces à Daloa.

-- 1. Activer l'extension pg_trgm pour la recherche trigramme tolérante
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Index GIN trigramme sur les annonces actives pour accélérer les ILIKE et similitudes
CREATE INDEX IF NOT EXISTS idx_listings_title_trgm
  ON public.listings
  USING gin (title gin_trgm_ops)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_listings_desc_trgm
  ON public.listings
  USING gin (description gin_trgm_ops)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_listings_district_trgm
  ON public.listings
  USING gin (district gin_trgm_ops)
  WHERE status = 'active';

COMMENT ON INDEX public.idx_listings_title_trgm
  IS 'Accélère la recherche fuzzy et l expansion des synonymes sur les titres (F05)';
