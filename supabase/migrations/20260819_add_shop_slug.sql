-- Migration: Ajouter shop_slug aux utilisateurs pour le Levier A (URLs lisibles)
-- Ex: daloamarket.com/shop/chez-mama-aisha au lieu de /b/a1b2c3d4

-- 1. Ajouter la colonne shop_slug (unique, nullable)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS shop_slug TEXT UNIQUE;

-- 2. Index pour les lookups rapides
CREATE INDEX IF NOT EXISTS idx_users_shop_slug ON public.users (shop_slug) WHERE shop_slug IS NOT NULL;

-- 3. Fonction pour générer un slug à partir du shop_name
CREATE OR REPLACE FUNCTION public.generate_shop_slug(input_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  IF input_name IS NULL OR trim(input_name) = '' THEN
    RETURN NULL;
  END IF;

  -- Normaliser : minuscules, remplacer espaces/accents par des tirets
  base_slug := lower(trim(input_name));
  -- Supprimer les accents courants
  base_slug := translate(base_slug,
    'àáâãäåæçèéêëìíîïðñòóôõöùúûüýÿ',
    'aaaaaaeceeeeiiiidnoooooouuuuyy');
  -- Remplacer tout ce qui n'est pas alphanumérique par des tirets
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  -- Supprimer les tirets en début/fin
  base_slug := trim(BOTH '-' FROM base_slug);

  IF base_slug = '' THEN
    RETURN NULL;
  END IF;

  -- Vérifier l'unicité
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.users WHERE shop_slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$;

-- 4. Trigger pour auto-générer le slug quand shop_name change
CREATE OR REPLACE FUNCTION public.auto_generate_shop_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ne générer le slug que si shop_name a changé et que le slug est vide
  IF (NEW.shop_name IS DISTINCT FROM OLD.shop_name) AND (NEW.shop_slug IS NULL OR NEW.shop_slug = '') THEN
    NEW.shop_slug := public.generate_shop_slug(NEW.shop_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_shop_slug ON public.users;
CREATE TRIGGER trg_auto_shop_slug
  BEFORE INSERT OR UPDATE OF shop_name ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_shop_slug();

-- 5. Remplir les slugs pour les boutiques existantes qui ont déjà un shop_name
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, shop_name FROM public.users WHERE shop_name IS NOT NULL AND shop_name != '' AND shop_slug IS NULL
  LOOP
    UPDATE public.users SET shop_slug = public.generate_shop_slug(r.shop_name) WHERE id = r.id;
  END LOOP;
END;
$$;
