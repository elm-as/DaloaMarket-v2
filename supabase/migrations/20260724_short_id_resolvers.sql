-- Function to resolve listing by short 8-char ID or full UUID
CREATE OR REPLACE FUNCTION get_listing_by_short_id(p_id text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  price integer,
  original_price integer,
  description text,
  category text,
  condition text,
  district text,
  photos text[],
  status text,
  stock integer,
  contact_phone text,
  views integer,
  boosted_until timestamptz,
  created_at timestamptz,
  seller_id uuid,
  seller_full_name text,
  seller_avatar_url text,
  seller_phone text,
  seller_district text,
  seller_rating numeric,
  seller_pro_until timestamptz,
  seller_shop_name text,
  seller_shop_logo_url text,
  seller_created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.user_id,
    l.title,
    l.price,
    l.original_price,
    l.description,
    l.category,
    l.condition,
    l.district,
    l.photos,
    l.status,
    l.stock,
    l.contact_phone,
    l.views,
    l.boosted_until,
    l.created_at,
    u.id AS seller_id,
    u.full_name AS seller_full_name,
    u.avatar_url AS seller_avatar_url,
    u.phone AS seller_phone,
    u.district AS seller_district,
    u.rating AS seller_rating,
    u.pro_until AS seller_pro_until,
    u.shop_name AS seller_shop_name,
    u.shop_logo_url AS seller_shop_logo_url,
    u.created_at AS seller_created_at
  FROM listings l
  LEFT JOIN users u ON u.id = l.user_id
  WHERE l.id::text LIKE p_id || '%'
  ORDER BY l.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to resolve seller by short 8-char ID, full UUID, or shop_name
CREATE OR REPLACE FUNCTION get_seller_by_short_id(p_id text)
RETURNS SETOF users AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM users
  WHERE id::text LIKE p_id || '%' OR shop_name ILIKE p_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
