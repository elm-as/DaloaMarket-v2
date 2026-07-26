-- RLS sur la table orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their orders" ON orders
  FOR SELECT USING (buyer_id = auth.uid());

CREATE POLICY "Sellers can view their orders" ON orders
  FOR SELECT USING (seller_id = auth.uid());

CREATE POLICY "Buyers can insert orders" ON orders
  FOR INSERT WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Owners can update their orders" ON orders
  FOR UPDATE USING (buyer_id = auth.uid() OR seller_id = auth.uid());
