-- Extension PostGIS pour le calcul des distances
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;

-- Fonction de calcul des frais de livraison dynamiques
-- Retourne max(500, distance_km * 200) en FCFA
CREATE OR REPLACE FUNCTION calculate_delivery_fee(
  seller_lat double precision,
  seller_lng double precision,
  buyer_lat double precision,
  buyer_lng double precision
) RETURNS integer AS $$
BEGIN
  RETURN GREATEST(
    500,
    ROUND(
      (earth_distance(
        ll_to_earth(seller_lat, seller_lng),
        ll_to_earth(buyer_lat, buyer_lng)
      ) / 1000) * 200
    )
  );
END;
$$ LANGUAGE plpgsql STABLE;
