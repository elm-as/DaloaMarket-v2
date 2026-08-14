-- Variantes de produits (tailles, pointures, etc.)
-- Les anciennes annonces conservent une liste vide et continuent d'utiliser price/stock.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS variant_id text,
  ADD COLUMN IF NOT EXISTS variant_label text,
  ADD COLUMN IF NOT EXISTS unit_price numeric,
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.listings.variants IS
  'Variantes de l''annonce. Chaque élément contient id, label, price (optionnel), stock et active.';
COMMENT ON COLUMN public.orders.variant_label IS
  'Libellé de variante conservé au moment de la commande (ex. taille 42).';
COMMENT ON COLUMN public.orders.unit_price IS
  'Prix unitaire réellement payé, conservé au moment de la commande.';

-- Les informations de variante sont des instantanés historiques : elles ne doivent pas
-- pouvoir être modifiées par un acheteur après la création de la commande.
CREATE OR REPLACE FUNCTION public.protect_orders_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF is_admin_or_service_role() THEN
    RETURN NEW;
  END IF;

  NEW.status = OLD.status;
  NEW.total_amount = OLD.total_amount;
  NEW.buyer_id = OLD.buyer_id;
  NEW.seller_id = OLD.seller_id;
  NEW.listing_id = OLD.listing_id;
  NEW.variant_id = OLD.variant_id;
  NEW.variant_label = OLD.variant_label;
  NEW.unit_price = OLD.unit_price;
  NEW.quantity = OLD.quantity;
  NEW.created_at = OLD.created_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Le stock général reste maintenu pour la compatibilité avec les anciennes annonces.
-- Pour une annonce avec variantes, le stock de la variante et le stock général sont
-- décrémentés ensemble. La quantité est conservée sur la commande.
CREATE OR REPLACE FUNCTION public.manage_listing_stock_on_order()
RETURNS TRIGGER AS $$
DECLARE
  v_quantity integer := GREATEST(COALESCE(NEW.quantity, 1), 1);
BEGIN
  IF TG_OP = 'INSERT' AND NEW.variant_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.listings AS listing
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(listing.variants, '[]'::jsonb)) AS elements(item)
      WHERE listing.id = NEW.listing_id
        AND elements.item->>'id' = NEW.variant_id
        AND COALESCE(elements.item->>'active', 'true') <> 'false'
        AND COALESCE(NULLIF(elements.item->>'stock', '')::integer, 0) >= v_quantity
    ) THEN
      RAISE EXCEPTION 'Variante indisponible ou stock insuffisant';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    UPDATE public.listings AS l
    SET
      variants = CASE
        WHEN NEW.variant_id IS NULL THEN l.variants
        ELSE COALESCE((
          SELECT jsonb_agg(
            CASE
              WHEN item->>'id' = NEW.variant_id THEN
                jsonb_set(
                  item,
                  '{stock}',
                  to_jsonb(GREATEST(0, COALESCE(NULLIF(item->>'stock', '')::integer, 0) - v_quantity)),
                  true
                )
              ELSE item
            END
            ORDER BY ord
          )
          FROM jsonb_array_elements(COALESCE(l.variants, '[]'::jsonb)) WITH ORDINALITY AS elements(item, ord)
        ), '[]'::jsonb)
      END,
      stock = GREATEST(0, l.stock - v_quantity),
      status = CASE WHEN GREATEST(0, l.stock - v_quantity) = 0 THEN 'sold' ELSE l.status END
    WHERE l.id = NEW.listing_id;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
      UPDATE public.listings AS l
      SET
        variants = CASE
          WHEN NEW.variant_id IS NULL THEN l.variants
          ELSE COALESCE((
            SELECT jsonb_agg(
              CASE
                WHEN item->>'id' = NEW.variant_id THEN
                  jsonb_set(
                    item,
                    '{stock}',
                    to_jsonb(COALESCE(NULLIF(item->>'stock', '')::integer, 0) + v_quantity),
                    true
                  )
                ELSE item
              END
              ORDER BY ord
            )
            FROM jsonb_array_elements(COALESCE(l.variants, '[]'::jsonb)) WITH ORDINALITY AS elements(item, ord)
          ), '[]'::jsonb)
        END,
        stock = l.stock + v_quantity,
        status = CASE WHEN l.status = 'sold' THEN 'active' ELSE l.status END
      WHERE l.id = NEW.listing_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS orders_protect_columns_trigger ON public.orders;
CREATE TRIGGER orders_protect_columns_trigger
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.protect_orders_columns();

DROP TRIGGER IF EXISTS trg_manage_listing_stock_on_order ON public.orders;
CREATE TRIGGER trg_manage_listing_stock_on_order
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.manage_listing_stock_on_order();
