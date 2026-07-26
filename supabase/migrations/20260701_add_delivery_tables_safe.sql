-- ============================================================================
-- MIGRATION SAFE : Ajout du système de livraison (sans suppression de données)
-- ============================================================================
-- Exécuter dans le SQL Editor de Supabase.
-- Utilise IF NOT EXISTS partout — aucune donnée existante ne sera supprimée.
-- ============================================================================


-- ============================================================
-- TABLE 1 : delivery_persons (Livreurs)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.delivery_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  photo_url text,
  is_available boolean DEFAULT true,
  rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_reviews integer DEFAULT 0 CHECK (total_reviews >= 0),
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('motorcycle', 'car', 'bicycle', 'foot')),
  vehicle_details text,
  current_location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  coverage_zones text[] DEFAULT '{}',
  pricing_description text,
  description text,
  cni_url text,
  permis_url text,
  verified boolean DEFAULT false
);

ALTER TABLE public.delivery_persons ENABLE ROW LEVEL SECURITY;

-- Policies delivery_persons
DO $$ BEGIN
  CREATE POLICY "Anyone can view delivery" ON public.delivery_persons FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Own delivery person" ON public.delivery_persons FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- TABLE 2 : delivery_person_reviews (Avis sur les livreurs)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.delivery_person_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_person_id uuid REFERENCES public.delivery_persons(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.delivery_person_reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read delivery reviews" ON public.delivery_person_reviews FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users create delivery reviews" ON public.delivery_person_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- TABLE 3 : delivery_requests (Commandes de livraison)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.delivery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pickup_location text NOT NULL,
  dropoff_location text NOT NULL,
  proposed_price numeric NOT NULL DEFAULT 500,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'picked_up', 'delivered', 'cancelled')),
  assigned_driver_id uuid REFERENCES public.delivery_persons(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Clients and Sellers can view their requests" ON public.delivery_requests
    FOR SELECT USING (auth.uid() = client_id OR auth.uid() = seller_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Drivers can view pending or their assigned requests" ON public.delivery_requests
    FOR SELECT USING (
      status = 'pending' OR
      assigned_driver_id IN (SELECT id FROM delivery_persons WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Clients can create requests" ON public.delivery_requests
    FOR INSERT WITH CHECK (auth.uid() = client_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their requests" ON public.delivery_requests
    FOR UPDATE USING (
      auth.uid() = client_id OR
      assigned_driver_id IN (SELECT id FROM delivery_persons WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- TABLE 4 : delivery_offers (Contre-offres des livreurs)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.delivery_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.delivery_persons(id) ON DELETE CASCADE,
  offered_price numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(request_id, driver_id)
);

ALTER TABLE public.delivery_offers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Clients can view offers for their requests" ON public.delivery_offers
    FOR SELECT USING (request_id IN (SELECT id FROM delivery_requests WHERE client_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Drivers can manage their own offers" ON public.delivery_offers
    FOR ALL USING (driver_id IN (SELECT id FROM delivery_persons WHERE user_id = auth.uid()))
    WITH CHECK (driver_id IN (SELECT id FROM delivery_persons WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Clients can update offers to accept/reject" ON public.delivery_offers
    FOR UPDATE USING (request_id IN (SELECT id FROM delivery_requests WHERE client_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- DONE
-- ============================================================
SELECT 'Migration livraison appliquée avec succès (aucune donnée supprimée) !' AS result;
