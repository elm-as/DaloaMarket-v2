-- ============================================================================
-- Ajout latitude / longitude aux tables users et listings
-- ============================================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS longitude double precision;

-- Ajout d'un index à jour pour le nouveau champ original_price (discount)
-- déjà ajouté via la migration précédente, mais on le reprend proprement ici
DO $$ BEGIN
  ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS original_price integer;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

SELECT '✅ lat/lng + original_price ajoutés aux tables users et listings !' AS result;
