DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname = 'Users can update their own messages'
  ) THEN
    CREATE POLICY "Users can update their own messages"
      ON public.messages
      FOR UPDATE
      TO authenticated
      USING (sender_id = auth.uid() OR receiver_id = auth.uid())
      WITH CHECK (sender_id = auth.uid() OR receiver_id = auth.uid());
  END IF;
END $$;
