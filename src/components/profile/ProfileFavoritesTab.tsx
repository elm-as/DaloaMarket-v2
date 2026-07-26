import React, { useState, useEffect, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import ListingCard, { type ListingCardData } from '../listings/ListingCard';

export const ProfileFavoritesTab: React.FC<{ userId: string }> = ({ userId }) => {
  const [favorites, setFavorites] = useState<ListingCardData[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    if (!userId) return;
    setFavoritesLoading(true);
    setFavoritesError(null);
    try {
      const { data: favData, error: favError } = await supabase
        .from('favorites')
        .select('listing_id')
        .eq('user_id', userId);

      if (favError) throw favError;

      const listingIds = (favData || []).map((f) => f.listing_id);

      if (listingIds.length === 0) {
        setFavorites([]);
        setFavoritesLoading(false);
        return;
      }

      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .in('id', listingIds)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });

      if (listingsError) throw listingsError;

      const formatted: ListingCardData[] = (listings || []).map((l: any) => ({
        id: l.id,
        title: l.title,
        price: l.price,
        photos: l.photos || [],
        created_at: l.created_at,
        district: l.district || 'Daloa',
        condition: l.condition || 'neuf',
        category: l.category || 'Autre',
        boosted_until: l.boosted_until || null,
        seller: {
          name: l.profiles?.full_name || 'Vendeur',
          avatar: l.profiles?.avatar_url || null,
        },
        is_favorite: true,
        stock: l.stock ?? 1,
        listing_user_id: l.user_id,
        original_price: l.original_price || null,
      }));

      setFavorites(formatted);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setFavoritesError('Impossible de charger vos favoris.');
    } finally {
      setFavoritesLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return (
    <>
      {favoritesLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height="240px" rounded="lg" />
          ))}
        </div>
      ) : favoritesError ? (
        <ErrorState message={favoritesError} onRetry={fetchFavorites} />
      ) : favorites.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-16 h-16 opacity-40" />}
          title="Aucun favori"
          description="Ajoutez des annonces à vos favoris pour les retrouver facilement."
        />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {favorites.map((listing, index) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              index={index}
            />
          ))}
        </div>
      )}
    </>
  );
};
