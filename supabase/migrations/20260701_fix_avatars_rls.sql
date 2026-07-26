-- Fix avatars bucket RLS policies

-- 1. Ensure the bucket is public if avatars should be readable by anyone
-- (If it's public, the bucket configuration handles read access, but we also need a SELECT policy just in case)
UPDATE storage.buckets SET public = true WHERE id = 'avatars';

-- 2. Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_select_all" ON storage.objects;

-- 3. Create SELECT policy (everyone can view avatars)
CREATE POLICY "avatars_select_all" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 4. Create INSERT policy (Users can upload their own avatar)
CREATE POLICY "avatars_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Create UPDATE policy (Users can update their own avatar)
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 6. Create DELETE policy (Users can delete their own avatar)
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
