-- Migration: Secure Column Updates via Triggers
-- Date: 2026-07-09
-- Description: Empêche les utilisateurs de modifier les colonnes sensibles de leurs propres lignes.
-- Seuls les admins ou le backend (service_role) peuvent le faire.

-- Fonction utilitaire pour vérifier si l'appelant est le backend ou un admin
CREATE OR REPLACE FUNCTION is_admin_or_service_role()
RETURNS boolean AS $$
DECLARE
  v_role text;
BEGIN
  -- Si on est le backend ou un RPC avec privilèges
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN true;
  END IF;
  
  -- Vérification du rôle admin
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
    IF v_role = 'admin' THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 1. Table: users
-- ==========================================
CREATE OR REPLACE FUNCTION protect_users_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF is_admin_or_service_role() THEN
    RETURN NEW;
  END IF;

  -- Restaurer les valeurs sensibles depuis OLD
  NEW.role = OLD.role;
  NEW.banned = OLD.banned;
  NEW.pro_until = OLD.pro_until;
  NEW.rating = OLD.rating;
  NEW.first_listing_at = OLD.first_listing_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS users_protect_columns_trigger ON public.users;
CREATE TRIGGER users_protect_columns_trigger
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION protect_users_columns();

-- ==========================================
-- 2. Table: delivery_assignments
-- ==========================================
CREATE OR REPLACE FUNCTION protect_delivery_assignments_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF is_admin_or_service_role() THEN
    RETURN NEW;
  END IF;

  -- Restaurer toutes les valeurs (tout passe par RPC)
  NEW.status = OLD.status;
  NEW.order_id = OLD.order_id;
  NEW.delivery_person_id = OLD.delivery_person_id;
  NEW.pickup_confirmed_by_seller = OLD.pickup_confirmed_by_seller;
  NEW.pickup_confirmed_at = OLD.pickup_confirmed_at;
  NEW.pickup_otp = OLD.pickup_otp;
  NEW.delivery_otp = OLD.delivery_otp;
  NEW.pickup_otp_attempts = OLD.pickup_otp_attempts;
  NEW.delivery_otp_attempts = OLD.delivery_otp_attempts;
  NEW.accepted_at = OLD.accepted_at;
  NEW.delivery_address = OLD.delivery_address;
  NEW.delivery_lat = OLD.delivery_lat;
  NEW.delivery_lng = OLD.delivery_lng;
  NEW.pickup_gps = OLD.pickup_gps;
  NEW.pickup_gps_distance_m = OLD.pickup_gps_distance_m;
  NEW.delivery_gps = OLD.delivery_gps;
  NEW.delivery_gps_distance_m = OLD.delivery_gps_distance_m;
  NEW.pickup_photo_url = OLD.pickup_photo_url;
  NEW.delivered_at = OLD.delivered_at;
  NEW.buyer_confirmed_at = OLD.buyer_confirmed_at;
  NEW.auto_released_at = OLD.auto_released_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS delivery_assignments_protect_columns_trigger ON public.delivery_assignments;
CREATE TRIGGER delivery_assignments_protect_columns_trigger
BEFORE UPDATE ON public.delivery_assignments
FOR EACH ROW
EXECUTE FUNCTION protect_delivery_assignments_columns();

-- ==========================================
-- 3. Table: orders
-- ==========================================
CREATE OR REPLACE FUNCTION protect_orders_columns()
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
  NEW.created_at = OLD.created_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS orders_protect_columns_trigger ON public.orders;
CREATE TRIGGER orders_protect_columns_trigger
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION protect_orders_columns();

-- ==========================================
-- 4. Table: listings
-- ==========================================
CREATE OR REPLACE FUNCTION protect_listings_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF is_admin_or_service_role() THEN
    RETURN NEW;
  END IF;

  NEW.is_boosted = OLD.is_boosted;
  NEW.boosted_until = OLD.boosted_until;
  NEW.status = OLD.status;
  NEW.user_id = OLD.user_id;
  NEW.views_count = OLD.views_count;
  NEW.created_at = OLD.created_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS listings_protect_columns_trigger ON public.listings;
CREATE TRIGGER listings_protect_columns_trigger
BEFORE UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION protect_listings_columns();
