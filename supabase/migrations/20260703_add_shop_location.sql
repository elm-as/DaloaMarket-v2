-- ============================================================================
-- Ajout emplacement boutique (shop_latitude, shop_longitude) aux vendeurs
-- ============================================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS shop_latitude double precision;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS shop_longitude double precision;

SELECT '✅ shop_latitude et shop_longitude ajoutés à la table users !' AS result;
