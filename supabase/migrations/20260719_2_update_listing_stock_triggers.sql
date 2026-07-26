-- ========================================================
-- MIGRATION: 20260719_2_update_listing_stock_triggers.sql
-- ========================================================

-- 1. S'assurer que la relation clé étrangère existe entre orders et listings pour les requêtes de jointure
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS fk_orders_listings;

ALTER TABLE public.orders 
ADD CONSTRAINT fk_orders_listings
FOREIGN KEY (listing_id) 
REFERENCES public.listings(id)
ON DELETE SET NULL;

-- 2. Fonction trigger pour gérer le stock automatiquement
CREATE OR REPLACE FUNCTION manage_listing_stock_on_order()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stock integer;
BEGIN
  -- CAS 1 : Nouvelle commande insérée (INSERT)
  IF TG_OP = 'INSERT' THEN
    SELECT stock INTO v_current_stock FROM public.listings WHERE id = NEW.listing_id;
    
    IF v_current_stock IS NOT NULL THEN
      -- Décrémenter le stock et passer le statut à 'sold' si épuisé (stock = 0)
      UPDATE public.listings
      SET 
        stock = GREATEST(0, stock - 1),
        status = CASE WHEN GREATEST(0, stock - 1) = 0 THEN 'sold' ELSE status END
      WHERE id = NEW.listing_id;
    END IF;
  
  -- CAS 2 : Commande mise à jour (UPDATE)
  ELSIF TG_OP = 'UPDATE' THEN
    -- Si la commande passe au statut annulé (cancelled), restituer le stock
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
      UPDATE public.listings
      SET 
        stock = stock + 1,
        status = CASE WHEN status = 'sold' THEN 'active' ELSE status END
      WHERE id = NEW.listing_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Création du trigger après insertion ou mise à jour de la commande
DROP TRIGGER IF EXISTS trg_manage_listing_stock_on_order ON public.orders;

CREATE TRIGGER trg_manage_listing_stock_on_order
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION manage_listing_stock_on_order();
