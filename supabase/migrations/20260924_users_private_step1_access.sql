-- Protection des données personnelles, étape 1 sur 2 : accès de remplacement.
--
-- La table `users` est lisible par tous (anon compris), colonnes privées
-- incluses : e-mail, téléphone, Mobile Money, IP, motifs de bannissement…
-- L'étape 2 (20260924_users_private_step2_revoke.sql) ferme ces colonnes.
-- Cette étape n'ajoute que les accès qui les remplacent ; elle ne retire rien
-- et peut être appliquée avant le déploiement du nouveau code.

-- 1. Profil complet : sa propre ligne, ou toutes pour un admin.
--    Vue exécutée avec les droits de son propriétaire (pas security_invoker) :
--    elle lit les colonnes privées, et le filtre ci-dessous décide des lignes.
create or replace view public.users_private
with (security_barrier = true) as
  select u.*
  from public.users u
  where u.id = auth.uid()
     or public.is_admin_or_service_role();

revoke all on public.users_private from public, anon;
grant select on public.users_private to authenticated, service_role;

-- 2. Téléphones de contact, seulement quand il y a une raison de les voir :
--    - soi-même, ou un admin ;
--    - un vendeur qui a au moins une annonce en ligne (bouton WhatsApp des
--      annonces et des vitrines) : son WhatsApp de boutique, sinon son téléphone ;
--    - l'autre partie d'une commande (acheteur <-> vendeur) ;
--    - l'acheteur ou le vendeur d'une course, pour le livreur qui la fait.
create or replace function public.get_contact_phones(p_user_ids uuid[])
returns table (user_id uuid, phone text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.id,
         coalesce(nullif(trim(u.shop_whatsapp), ''), u.phone)
  from public.users u
  where u.id = any(p_user_ids)
    and u.deleted_at is null
    and (
      u.id = auth.uid()
      or public.is_admin_or_service_role()
      or exists (
        select 1 from public.listings l
        where l.user_id = u.id and l.status = 'active'
      )
      or exists (
        select 1 from public.orders o
        where (o.buyer_id = auth.uid() and o.seller_id = u.id)
           or (o.seller_id = auth.uid() and o.buyer_id = u.id)
      )
      or exists (
        select 1
        from public.delivery_assignments a
        join public.delivery_persons dp on dp.id = a.delivery_person_id
        join public.orders o on o.id = a.order_id
        where dp.user_id = auth.uid()
          and u.id in (o.buyer_id, o.seller_id)
      )
    );
$$;

revoke all on function public.get_contact_phones(uuid[]) from public;
grant execute on function public.get_contact_phones(uuid[]) to anon, authenticated, service_role;
