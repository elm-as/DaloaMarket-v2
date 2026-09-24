-- Protection des données personnelles, étape 2 sur 2 : fermeture des colonnes.
--
-- À APPLIQUER SEULEMENT APRÈS le déploiement du site DaloaMarket, du site
-- DaloaDelivery et des apps qui lisent `users_private` et `get_contact_phones`
-- (étape 1). Appliquée avant, l'ancien code en ligne (select('*') sur users)
-- échouerait.
--
-- Après cette étape, anon et authenticated ne lisent plus dans `users` que les
-- colonnes publiques. E-mail, téléphone, Mobile Money, IP, bannissement,
-- annulations, parrainage et crédits passent par `users_private` (sa ligne, ou
-- toutes pour un admin) et `get_contact_phones`. Les écritures ne changent pas.
-- Railway, les fonctions Edge et pg_cron utilisent service_role : non concernés.

revoke select on public.users from anon, authenticated;

grant select (
  id, full_name, district, created_at, rating, first_listing_at, banned, role,
  avatar_url, pro_until, pro_source, shop_name, shop_description,
  shop_banner_url, shop_logo_url, shop_whatsapp, shop_theme_color,
  shop_updated_at, shop_latitude, shop_longitude, shop_slug, deleted_at
) on public.users to anon, authenticated;

-- La vue des créances COD lisait `users.phone` avec les droits de l'appelant.
-- Elle est réservée à l'administration : droits du propriétaire + filtre admin.
create or replace view public.cod_receivables_outstanding
with (security_barrier = true) as
  select r.debtor_user_id,
         r.debtor_role,
         u.full_name,
         u.phone,
         count(*) as orders_count,
         sum(r.amount) as total_due,
         min(r.created_at) as oldest_at
  from public.cod_receivables r
  join public.users u on u.id = r.debtor_user_id
  where r.status = 'outstanding'
    and public.is_admin_or_service_role()
  group by r.debtor_user_id, r.debtor_role, u.full_name, u.phone;

alter view public.cod_receivables_outstanding reset (security_invoker);
revoke all on public.cod_receivables_outstanding from public, anon;
grant select on public.cod_receivables_outstanding to authenticated, service_role;
