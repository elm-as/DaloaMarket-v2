-- ============================================================================
-- Fix Storage RLS — Bucket listings + avatars
-- À exécuter dans le SQL Editor du projet V2
-- ============================================================================

-- 1) S'assurer que les buckets existent et sont publics
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('listings', 'listings', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 2) Supprimer les anciennes policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'storage.objects'::regclass
      AND (polname ILIKE '%listing%' OR polname ILIKE '%avatar%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.polname);
  END LOOP;
END $$;

-- 3) LISTINGS — fichiers stockés sous {user_id}/{listing_id}/{filename}
CREATE POLICY "listings_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "listings_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "listings_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "listings_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4) AVATARS — fichiers stockés sous {user_id}/{filename}
CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

SELECT 'Storage policies OK — listings + avatars buckets sécurisés !' AS result;
