-- Migration: Corrections d'audit pour les triggers et la table notifications
-- Date: 2026-07-15

-- 1. Création de la table notifications si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  url text,
  created_at timestamptz DEFAULT now()
);

-- Sécurisation de la table notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view and insert notifications" ON public.notifications;
CREATE POLICY "Admins can view and insert notifications" ON public.notifications
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- 2. Correction du trigger protect_delivery_assignments_columns pour autoriser l'acheteur à confirmer la réception
CREATE OR REPLACE FUNCTION protect_delivery_assignments_columns()
RETURNS TRIGGER AS $$
DECLARE
  v_is_buyer boolean := false;
BEGIN
  IF is_admin_or_service_role() THEN
    RETURN NEW;
  END IF;

  -- Vérifier si l'appelant est l'acheteur de la commande
  SELECT (o.buyer_id = auth.uid()) INTO v_is_buyer
  FROM public.orders o
  WHERE o.id = OLD.order_id;

  IF v_is_buyer = true THEN
    -- L'acheteur est autorisé à modifier uniquement buyer_confirmed_at
    NEW.buyer_confirmed_at = NEW.buyer_confirmed_at;
  ELSE
    NEW.buyer_confirmed_at = OLD.buyer_confirmed_at;
  END IF;

  -- Restaurer toutes les autres colonnes
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
  NEW.auto_released_at = OLD.auto_released_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
