-- Statistiques vendeur : vraies visites.
--
-- `listings.view_count` a été pré-rempli à l'import (≈ 35 vues par annonce pour
-- le lot du 17/08, sans aucune visite enregistrée) ; il reste utilisé pour le
-- classement « Populaire à Daloa ». Les statistiques du vendeur affichent
-- désormais les visiteurs réellement enregistrés dans `listing_views` (un par
-- personne et par annonce, le vendeur exclu), tenus depuis le 27/08/2026.
-- `listing_views` reste illisible par les clients (identifiants des visiteurs) :
-- la fonction ne renvoie qu'un nombre, et seulement pour ses propres annonces.

create or replace function public.get_my_listing_visitors()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.listing_views v
  join public.listings l on l.id = v.listing_id
  where l.user_id = auth.uid();
$$;

revoke all on function public.get_my_listing_visitors() from public, anon;
grant execute on function public.get_my_listing_visitors() to authenticated, service_role;
