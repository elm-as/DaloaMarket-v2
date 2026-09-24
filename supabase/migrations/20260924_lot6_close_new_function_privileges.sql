-- Hygiène après les lots 0 à 4 : une fonction nouvellement créée reçoit
-- EXECUTE pour PUBLIC. Les fonctions de trigger n'ont rien à faire dans l'API
-- (/rest/v1/rpc/...) ; les RPC internes non plus.
REVOKE EXECUTE ON FUNCTION public.trg_delivery_person_sets_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_sanitize_feature_suggestion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_feature_author_upvote() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_refresh_driver_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_refresh_seller_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_alert_new_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.manage_listing_stock_on_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_sensitive_user_self_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_restore_listing_stock(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_open_order_dispute(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

-- RPC réservées aux utilisateurs connectés : pas d'accès anonyme.
REVOKE EXECUTE ON FUNCTION public.cancel_order_unavailable(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_pickup_order(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.report_delivery_dispute(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order_unavailable(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_pickup_order(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_delivery_dispute(uuid, text) TO authenticated;

ALTER FUNCTION public.fn_signup_role(text) SET search_path = public, pg_temp;
