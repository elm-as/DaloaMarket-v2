-- Migration pour ajouter les RLS policies à delivery_assignments
-- Date: 7 juillet 2026
-- Objectif: Sécuriser les mises à jour de delivery_assignments côté base de données

-- 1. Activer RLS sur delivery_assignments
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Policy pour les livreurs : peuvent voir leurs assignments
CREATE POLICY "delivery_assignments_select_own"
ON public.delivery_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM delivery_persons dp
    WHERE dp.id = delivery_person_id
    AND dp.user_id = auth.uid()
  )
);

-- 3. Policy pour les vendeurs : peuvent voir les assignments de leurs commandes
CREATE POLICY "delivery_assignments_select_seller"
ON public.delivery_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = delivery_assignments.order_id
    AND o.seller_id = auth.uid()
  )
);

-- 4. Policy pour les acheteurs : peuvent voir les assignments de leurs commandes
CREATE POLICY "delivery_assignments_select_buyer"
ON public.delivery_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = delivery_assignments.order_id
    AND o.buyer_id = auth.uid()
  )
);

-- 5. Policy pour les admins : peuvent tout voir
CREATE POLICY "delivery_assignments_select_admin"
ON public.delivery_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
  )
);

-- 6. Policy UPDATE pour les livreurs
CREATE POLICY "delivery_assignments_update_driver"
ON public.delivery_assignments
FOR UPDATE
TO authenticated
USING (
  -- Le livreur assigné peut mettre à jour ses missions
  EXISTS (
    SELECT 1 FROM delivery_persons dp
    WHERE dp.id = delivery_person_id
    AND dp.user_id = auth.uid()
  )
);

-- 7. Policy UPDATE pour les vendeurs
CREATE POLICY "delivery_assignments_update_seller"
ON public.delivery_assignments
FOR UPDATE
TO authenticated
USING (
  -- Le vendeur de la commande peut mettre à jour la mission (ex: confirmer le pickup)
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = delivery_assignments.order_id
    AND o.seller_id = auth.uid()
  )
);

-- 8. Policy UPDATE pour les admins
CREATE POLICY "delivery_assignments_update_admin"
ON public.delivery_assignments
FOR UPDATE
TO authenticated
USING (
  -- Les admins peuvent tout voir et modifier
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
  )
);

-- 9. Policy INSERT : seul le système (via service role) peut créer des assignments
-- Les créations se font via le webhook backend avec service role
-- Donc pas de policy INSERT pour authenticated

-- 10. Policy DELETE : seul admin peut supprimer
CREATE POLICY "delivery_assignments_delete_admin"
ON public.delivery_assignments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
  )
);

-- Commentaire pour documenter les policies
COMMENT ON POLICY "delivery_assignments_update_driver" ON public.delivery_assignments IS 'Permet aux livreurs de modifier leurs missions';
COMMENT ON POLICY "delivery_assignments_update_seller" ON public.delivery_assignments IS 'Permet aux vendeurs de modifier les missions liées à leurs commandes';
COMMENT ON POLICY "delivery_assignments_update_admin" ON public.delivery_assignments IS 'Permet aux administrateurs de tout modifier';
