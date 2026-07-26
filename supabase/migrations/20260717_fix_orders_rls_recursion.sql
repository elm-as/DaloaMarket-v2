-- Fix RLS Infinite Recursion on public.orders and public.delivery_assignments
-- Date: 2026-07-17

-- 1. Supprimer l'ancienne policy qui causait la récursion
DROP POLICY IF EXISTS "Drivers can view orders for their assignments" ON public.orders;

-- 2. Créer une fonction SECURITY DEFINER pour vérifier l'accès du livreur aux commandes sans déclencher de récursion
CREATE OR REPLACE FUNCTION public.has_order_delivery_access(p_order_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- A. Vérifier si l'utilisateur est le livreur assigné à cette commande
  IF EXISTS (
    SELECT 1 
    FROM public.delivery_assignments da
    JOIN public.delivery_persons dp ON dp.id = da.delivery_person_id
    WHERE da.order_id = p_order_id 
      AND dp.user_id = p_user_id
  ) THEN
    RETURN true;
  END IF;

  -- B. Vérifier si la commande a une livraison en attente de livreur ET que l'utilisateur est un livreur enregistré
  IF EXISTS (
    SELECT 1 
    FROM public.delivery_assignments da
    WHERE da.order_id = p_order_id 
      AND da.status = 'awaiting_pickup'
      AND da.delivery_person_id IS NULL
  ) AND EXISTS (
    SELECT 1 
    FROM public.delivery_persons dp
    WHERE dp.user_id = p_user_id
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Créer la nouvelle policy sécurisée sur public.orders utilisant la fonction SECURITY DEFINER
CREATE POLICY "Drivers can view orders for their assignments"
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.has_order_delivery_access(id, auth.uid())
);
