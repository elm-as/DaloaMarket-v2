-- Migration: Autoriser les acheteurs et livreurs à voir les annonces de leurs commandes (même si vendues ou supprimées)
-- Date: 2026-09-18
-- Problème : RLS sur `listings` ne permettait qu'à l'auteur (vendeur) et aux annonces 'active' d'être lues.
-- Dès qu'une commande était passée et que l'annonce devenait 'sold', l'acheteur et le livreur
-- recevaient `listings: null` dans les requêtes de commandes (titre "Commande DaloaMarket" et image de remplacement).

CREATE OR REPLACE FUNCTION public.can_view_listing_via_order(p_listing_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Est-ce que l'utilisateur est l'acheteur d'une commande contenant cette annonce ?
  IF EXISTS (
    SELECT 1 FROM public.orders o
    WHERE (o.listing_id = p_listing_id OR EXISTS (
      SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id AND oi.listing_id = p_listing_id
    ))
    AND o.buyer_id = p_user_id
  ) THEN
    RETURN true;
  END IF;

  -- 2. Est-ce que l'utilisateur est le livreur assigné à une commande contenant cette annonce ?
  IF EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.delivery_assignments da ON da.order_id = o.id
    JOIN public.delivery_persons dp ON dp.id = da.delivery_person_id
    WHERE (o.listing_id = p_listing_id OR EXISTS (
      SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id AND oi.listing_id = p_listing_id
    ))
    AND dp.user_id = p_user_id
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Buyers and drivers can view ordered listings" ON public.listings;
CREATE POLICY "Buyers and drivers can view ordered listings"
ON public.listings
FOR SELECT
TO authenticated
USING (
  public.can_view_listing_via_order(id, auth.uid())
);
