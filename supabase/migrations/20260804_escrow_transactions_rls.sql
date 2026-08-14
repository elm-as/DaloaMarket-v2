-- Migration: RLS policy for escrow_transactions
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers can insert escrow_transactions" ON public.escrow_transactions;
CREATE POLICY "Buyers can insert escrow_transactions" ON public.escrow_transactions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their escrow_transactions" ON public.escrow_transactions;
CREATE POLICY "Users can view their escrow_transactions" ON public.escrow_transactions
  FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());
