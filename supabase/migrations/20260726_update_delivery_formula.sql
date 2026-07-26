-- Migration: Update delivery fee formula
-- New formula: base 500 FCFA + 85 FCFA per km beyond 1.5 km
-- Previous formula was: GREATEST(500, distance_km * 200)

CREATE OR REPLACE FUNCTION calculate_delivery_fee(
  seller_lat double precision,
  seller_lng double precision,
  buyer_lat double precision,
  buyer_lng double precision
) RETURNS integer AS $$
DECLARE
  distance_km double precision;
BEGIN
  distance_km := earth_distance(
    ll_to_earth(seller_lat, seller_lng),
    ll_to_earth(buyer_lat, buyer_lng)
  ) / 1000;

  IF distance_km > 1.5 THEN
    RETURN 500 + ROUND((distance_km - 1.5) * 85);
  ELSE
    RETURN 500;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;
