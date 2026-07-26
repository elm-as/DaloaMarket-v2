-- Migration: Fix monetization transaction type constraint to allow credits and packs
-- Date: 2026-07-19

-- 1. Drop existing type check constraint
ALTER TABLE public.monetization_transactions 
DROP CONSTRAINT IF EXISTS monetization_transactions_type_check;

-- 2. Add updated type check constraint allowing new types
ALTER TABLE public.monetization_transactions 
ADD CONSTRAINT monetization_transactions_type_check 
CHECK (type = ANY (ARRAY[
  'boost'::text, 
  'bump'::text, 
  'seller_badge'::text, 
  'listing_pack_10'::text, 
  'credits_pack_5'::text, 
  'credits_pack_12'::text, 
  'credits_pack_30'::text
]));
