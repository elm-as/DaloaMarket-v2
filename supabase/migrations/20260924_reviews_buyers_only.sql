-- Avis : réservés aux acheteurs qui ont reçu leur commande.
--
-- La politique d'insertion ne vérifiait que reviewer_id = auth.uid() : n'importe
-- quel compte pouvait noter n'importe quel vendeur depuis la fiche annonce, sans
-- rien avoir acheté. Désormais il faut une commande livrée (ou clôturée) passée
-- chez ce vendeur, et, si l'avis vise une annonce, que cette annonce fasse partie
-- de la commande (commande simple ou ligne de panier).
-- Les avis déjà publiés ne sont pas touchés.

drop policy if exists "Users can create reviews" on public.reviews;

create policy "Buyers can review received orders" on public.reviews
  for insert
  to authenticated
  with check (
    auth.uid() = reviewer_id
    and reviewer_id <> reviewed_id
    and exists (
      select 1
      from public.orders o
      where o.buyer_id = auth.uid()
        and o.seller_id = reviews.reviewed_id
        and o.status in ('delivered', 'completed')
        and (
          reviews.listing_id is null
          or o.listing_id = reviews.listing_id
          or exists (
            select 1 from public.order_items oi
            where oi.order_id = o.id and oi.listing_id = reviews.listing_id
          )
        )
    )
  );
