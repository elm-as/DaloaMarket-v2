-- ========================================================
-- MIGRATION: 20260719_admin_delivery_photos.sql
-- ========================================================

-- 1. Mettre à jour la contrainte CHECK sur le rôle de la table public.users pour autoriser 'superadmin'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IN ('user', 'admin', 'superadmin', 'moderator', 'moderateur', 'helper'));

-- 1.bis Mettre à jour la contrainte CHECK sur le statut de la table public.payouts pour autoriser 'paid' et 'completed'
ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS payouts_status_check;

ALTER TABLE public.payouts ADD CONSTRAINT payouts_status_check 
CHECK (status IN ('pending', 'processing', 'paid', 'completed', 'failed'));

-- 2. Promouvoir l'utilisateur Elmas Oulobo comme superadmin
UPDATE public.users 
SET role = 'superadmin' 
WHERE id = '39ee0be2-ddb5-4124-b9f3-656a88b577bb';

-- 3. Création du bucket 'delivery-photos' (privé)
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-photos', 'delivery-photos', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Nettoyer les anciennes politiques pour ce bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow only admins and superadmins to view delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow only admins and superadmins to update delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow only admins and superadmins to delete delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners and admins to view delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners and admins to update delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners and admins to delete delivery photos" ON storage.objects;

-- 5. Créer les politiques RLS sécurisées pour le bucket delivery-photos
-- Tout utilisateur authentifié (livreur) peut téléverser une photo
CREATE POLICY "Allow authenticated users to upload delivery photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'delivery-photos');

-- Le propriétaire (le livreur qui l'a uploadée) et les admins/superadmins peuvent voir les photos (excluant moderator et helper)
CREATE POLICY "Allow owners and admins to view delivery photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'delivery-photos'
  AND (
    auth.uid() = owner
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  )
);

-- Le propriétaire et les admins/superadmins peuvent modifier les photos (nécessaire pour l'upsert)
CREATE POLICY "Allow owners and admins to update delivery photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'delivery-photos'
  AND (
    auth.uid() = owner
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  )
);

-- Le propriétaire et les admins/superadmins peuvent supprimer les photos
CREATE POLICY "Allow owners and admins to delete delivery photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'delivery-photos'
  AND (
    auth.uid() = owner
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  )
);

-- 6. Mise à jour de verify_pickup pour retirer la vérification de distance GPS
CREATE OR REPLACE FUNCTION verify_pickup(
  p_assignment_id uuid,
  p_otp text,
  p_photo_url text DEFAULT NULL,
  p_gps_lat numeric DEFAULT NULL,
  p_gps_lng numeric DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  assignment RECORD;
  order_record RECORD;
BEGIN
  SELECT * INTO assignment
  FROM delivery_assignments
  WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'assignment_not_found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM delivery_persons dp
    WHERE dp.id = assignment.delivery_person_id
      AND dp.user_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  IF assignment.status != 'accepted' THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_status', 'current_status', assignment.status);
  END IF;

  IF assignment.pickup_confirmed_by_seller IS NOT TRUE THEN
    RETURN json_build_object('success', false, 'reason', 'seller_not_confirmed');
  END IF;

  IF assignment.pickup_otp != p_otp THEN
    UPDATE delivery_assignments
    SET pickup_otp_attempts = pickup_otp_attempts + 1
    WHERE id = p_assignment_id;

    IF assignment.pickup_otp_attempts + 1 >= 3 THEN
      UPDATE delivery_assignments
      SET status = 'disputed', disputed_at = now(), dispute_reason = 'too_many_otp_attempts'
      WHERE id = p_assignment_id;

      RETURN json_build_object('success', false, 'reason', 'too_many_attempts', 'status', 'disputed');
    END IF;

    RETURN json_build_object('success', false, 'reason', 'invalid_otp', 'attempts', assignment.pickup_otp_attempts + 1, 'max_attempts', 3);
  END IF;

  -- Pas de vérification de distance GPS à la récupération
  UPDATE delivery_assignments
  SET
    status = 'in_transit',
    pickup_confirmed_at = now(),
    pickup_photo_url = p_photo_url,
    pickup_gps = CASE WHEN p_gps_lat IS NOT NULL THEN json_build_object('lat', p_gps_lat, 'lng', p_gps_lng) ELSE NULL END,
    pickup_gps_distance_m = 0,
    updated_at = now()
  WHERE id = p_assignment_id;

  UPDATE orders
  SET status = 'in_transit'
  WHERE id = assignment.order_id;

  RETURN json_build_object('success', true, 'status', 'in_transit');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION verify_pickup(uuid, text, text, numeric, numeric) TO authenticated;

-- 7. Mettre à jour is_admin_or_service_role() pour inclure superadmin
CREATE OR REPLACE FUNCTION is_admin_or_service_role()
RETURNS boolean AS $$
DECLARE
  v_role text;
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN true;
  END IF;
  
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
    IF v_role IN ('admin', 'superadmin') THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Mettre à jour les RLS de la table notifications pour inclure superadmin
DROP POLICY IF EXISTS "Admins can view and insert notifications" ON public.notifications;
CREATE POLICY "Admins can view and insert notifications" ON public.notifications
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin'))
  );

-- 9. Mettre à jour les RLS de la table delivery_assignments pour inclure superadmin
DROP POLICY IF EXISTS "delivery_assignments_select_admin" ON public.delivery_assignments;
CREATE POLICY "delivery_assignments_select_admin"
ON public.delivery_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IN ('admin', 'superadmin')
  )
);

DROP POLICY IF EXISTS "delivery_assignments_update_admin" ON public.delivery_assignments;
CREATE POLICY "delivery_assignments_update_admin"
ON public.delivery_assignments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IN ('admin', 'superadmin')
  )
);

DROP POLICY IF EXISTS "delivery_assignments_delete_admin" ON public.delivery_assignments;
CREATE POLICY "delivery_assignments_delete_admin"
ON public.delivery_assignments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IN ('admin', 'superadmin')
  )
);

-- 10. Fonction de résolution de litige de livraison pour l'admin
CREATE OR REPLACE FUNCTION resolve_delivery_dispute(
  p_assignment_id uuid,
  p_action text -- 'deliver' ou 'cancel'
)
RETURNS json AS $$
DECLARE
  assignment record;
  order_record record;
  v_transaction_id uuid;
  v_seller_amount integer;
BEGIN
  -- Vérifier si l'utilisateur est un admin ou superadmin
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  ) THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  SELECT * INTO assignment FROM delivery_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'reason', 'assignment_not_found'); END IF;

  SELECT * INTO order_record FROM orders WHERE id = assignment.order_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'reason', 'order_not_found'); END IF;

  IF p_action = 'deliver' THEN
    -- Mettre à jour l'attribution
    UPDATE delivery_assignments
    SET
      status = 'delivered',
      delivered_at = now(),
      buyer_confirmed_at = now(),
      updated_at = now()
    WHERE id = p_assignment_id;

    -- Mettre à jour la commande
    UPDATE orders
    SET status = 'delivered'
    WHERE id = assignment.order_id;

    -- Déclencher la création des payouts !
    SELECT id, seller_amount INTO v_transaction_id, v_seller_amount FROM escrow_transactions WHERE order_id = assignment.order_id LIMIT 1;
    IF v_transaction_id IS NOT NULL THEN
      PERFORM create_seller_payout(assignment.order_id, v_transaction_id, order_record.seller_id, v_seller_amount);
      PERFORM create_delivery_payout(assignment.order_id, v_transaction_id, assignment.delivery_person_id, order_record.delivery_fee);
    END IF;

    RETURN json_build_object('success', true, 'status', 'delivered');

  ELSIF p_action = 'cancel' THEN
    -- Annuler la livraison
    UPDATE delivery_assignments
    SET
      status = 'cancelled',
      updated_at = now()
    WHERE id = p_assignment_id;

    -- Remettre la commande en statut payé pour qu'elle puisse être réattribuée ou remboursée
    UPDATE orders
    SET status = 'paid'
    WHERE id = assignment.order_id;

    RETURN json_build_object('success', true, 'status', 'cancelled');
  ELSE
    RETURN json_build_object('success', false, 'reason', 'invalid_action');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION resolve_delivery_dispute(uuid, text) TO authenticated;
