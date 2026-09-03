-- ==============================================================================
-- Migration: Permettre aux acheteurs/vendeurs d'insérer un delivery_assignment
-- lors de la création d'une commande avec livraison
-- ==============================================================================

DROP POLICY IF EXISTS "delivery_assignments_insert_buyer" ON public.delivery_assignments;

CREATE POLICY "delivery_assignments_insert_buyer"
ON public.delivery_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = delivery_assignments.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
  )
);