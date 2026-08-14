-- Migration: Allow users to delete non-confirmed monetization transactions
-- Date: 2026-08-14

-- 1. DELETE RLS Policy on monetization_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'monetization_transactions' AND policyname = 'Users can delete own non-confirmed monetization transactions'
  ) THEN
    CREATE POLICY "Users can delete own non-confirmed monetization transactions"
      ON public.monetization_transactions
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id AND status IN ('pending', 'failed'));
  END IF;
END $$;

-- 2. RPC to safely delete a single pending/failed transaction
CREATE OR REPLACE FUNCTION public.delete_monetization_transaction(p_transaction_id uuid)
RETURNS boolean AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.monetization_transactions
  WHERE id = p_transaction_id
    AND user_id = v_user_id
    AND status IN ('pending', 'failed');

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.delete_monetization_transaction(uuid) TO authenticated;

-- 3. RPC to clean all expired/failed transactions
CREATE OR REPLACE FUNCTION public.clean_expired_monetization_transactions()
RETURNS integer AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.monetization_transactions
  WHERE user_id = v_user_id
    AND (status = 'failed' OR (status = 'pending' AND created_at < now() - interval '48 hours'));

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.clean_expired_monetization_transactions() TO authenticated;
