-- ==============================================================================
-- FIX STORAGE BUCKETS ROW-LEVEL SECURITY (RLS)
-- This script fixes the permission issues when uploading images (listings/avatars)
-- ==============================================================================

-- 1. Ensure buckets are public so anyone can view the images
UPDATE storage.buckets SET public = true WHERE id IN ('listings', 'avatars');

-- 2. Clean up existing policies to avoid conflicts
DROP POLICY IF EXISTS "listings_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "listings_update_own" ON storage.objects;
DROP POLICY IF EXISTS "listings_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "listings_select_all" ON storage.objects;

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_select_all" ON storage.objects;

-- 3. Create SELECT policies (Everyone can view files in these buckets)
CREATE POLICY "listings_select_all" ON storage.objects FOR SELECT USING (bucket_id = 'listings');
CREATE POLICY "avatars_select_all" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- 4. Create INSERT policies (Authenticated users can upload to their own folder)
-- The folder name must match their user ID
CREATE POLICY "listings_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Create UPDATE policies
CREATE POLICY "listings_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 6. Create DELETE policies
CREATE POLICY "listings_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
