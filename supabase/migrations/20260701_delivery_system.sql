-- ============================================================================
-- NOUVEAU SYSTEME DE LIVRAISON (COMMANDES ET CONTRE-OFFRES)
-- ============================================================================

DROP TABLE IF EXISTS public.delivery_offers CASCADE;
DROP TABLE IF EXISTS public.delivery_requests CASCADE;

-- 1. Table des requêtes de livraison (Commandes)
CREATE TABLE public.delivery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pickup_location text NOT NULL, -- Format: lat,lng ou adresse
  dropoff_location text NOT NULL, -- Format: lat,lng ou adresse
  proposed_price numeric NOT NULL DEFAULT 500,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'picked_up', 'delivered', 'cancelled')),
  assigned_driver_id uuid REFERENCES public.delivery_persons(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;

-- 2. Policies pour delivery_requests
CREATE POLICY "Clients and Sellers can view their requests" ON public.delivery_requests 
  FOR SELECT USING (auth.uid() = client_id OR auth.uid() = seller_id);

CREATE POLICY "Drivers can view pending or their assigned requests" ON public.delivery_requests 
  FOR SELECT USING (
    status = 'pending' OR 
    assigned_driver_id IN (SELECT id FROM delivery_persons WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients can create requests" ON public.delivery_requests 
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update their requests" ON public.delivery_requests 
  FOR UPDATE USING (
    auth.uid() = client_id OR 
    assigned_driver_id IN (SELECT id FROM delivery_persons WHERE user_id = auth.uid())
  );

-- 3. Table des contre-offres de livraison
CREATE TABLE public.delivery_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.delivery_persons(id) ON DELETE CASCADE,
  offered_price numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(request_id, driver_id)
);

ALTER TABLE public.delivery_offers ENABLE ROW LEVEL SECURITY;

-- 4. Policies pour delivery_offers
CREATE POLICY "Clients can view offers for their requests" ON public.delivery_offers 
  FOR SELECT USING (request_id IN (SELECT id FROM delivery_requests WHERE client_id = auth.uid()));

CREATE POLICY "Drivers can manage their own offers" ON public.delivery_offers 
  FOR ALL USING (driver_id IN (SELECT id FROM delivery_persons WHERE user_id = auth.uid()))
  WITH CHECK (driver_id IN (SELECT id FROM delivery_persons WHERE user_id = auth.uid()));

CREATE POLICY "Clients can update offers to accept/reject" ON public.delivery_offers 
  FOR UPDATE USING (request_id IN (SELECT id FROM delivery_requests WHERE client_id = auth.uid()));
