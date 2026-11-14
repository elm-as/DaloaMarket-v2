-- ============================================================================
-- MIGRATION P2-3 : Ciblage SQL côté base pour les campagnes Push segmentées
-- Évite le scan complet en RAM des tables `listings` et `orders` sur Railway.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_campaign_target_user_ids(p_segment text)
RETURNS TABLE (
  id uuid,
  full_name text,
  shop_name text,
  shop_slug text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH subscribed_market_users AS (
    SELECT DISTINCT ps.user_id
    FROM public.push_subscriptions ps
    WHERE ps.is_active = true
      AND ps.user_id IS NOT NULL
      AND COALESCE(ps.app_type, 'market') = 'market'
  )
  SELECT u.id, u.full_name, u.shop_name, u.shop_slug
  FROM public.users u
  INNER JOIN subscribed_market_users smu ON smu.user_id = u.id
  WHERE COALESCE(u.banned, false) = false
    AND u.deleted_at IS NULL
    AND (
      (p_segment = 'dormant'
        AND NOT EXISTS (
          SELECT 1 FROM public.listings l
          WHERE l.user_id = u.id AND l.status <> 'deleted'
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.buyer_id = u.id AND o.status <> 'cancelled'
        )
      )
      OR (p_segment = 'active_seller'
        AND EXISTS (
          SELECT 1 FROM public.listings l
          WHERE l.user_id = u.id AND l.status = 'active'
        )
      )
      OR (p_segment = 'seller_no_promo'
        AND EXISTS (
          SELECT 1 FROM public.listings l
          WHERE l.user_id = u.id AND l.status = 'active'
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.listings lp
          WHERE lp.user_id = u.id
            AND lp.status = 'active'
            AND lp.original_price IS NOT NULL
            AND lp.original_price > lp.price
        )
      )
      OR (p_segment = 'buyer_cancelled'
        AND EXISTS (
          SELECT 1 FROM public.orders oc
          WHERE oc.buyer_id = u.id AND oc.status = 'cancelled'
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.orders ov
          WHERE ov.buyer_id = u.id AND ov.status <> 'cancelled'
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.get_campaign_target_user_ids(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_campaign_target_user_ids(text) TO service_role;
