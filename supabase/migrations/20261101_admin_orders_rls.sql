-- Autorise l'administration (admin / superadmin / modérateur via is_admin_or_service_role)
-- à lire et mettre à jour les commandes, lignes de commande et transactions séquestre.
-- Sans ces politiques, RLS sur public.orders masquait à l'admin toutes les commandes
-- dont il n'était pas personnellement l'acheteur ou le vendeur.

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_service_role());

DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
CREATE POLICY "Admins can update all orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_service_role())
  WITH CHECK (public.is_admin_or_service_role());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all order_items" ON public.order_items';
    EXECUTE 'CREATE POLICY "Admins can view all order_items" ON public.order_items FOR SELECT TO authenticated USING (public.is_admin_or_service_role())';
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins can view all escrow_transactions" ON public.escrow_transactions;
CREATE POLICY "Admins can view all escrow_transactions"
  ON public.escrow_transactions
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_service_role());

