import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface FavoritesContextType {
  favoriteIds: Set<string>;
  isFavorited: (listingId: string) => boolean;
  toggleFavorite: (listingId: string) => Promise<boolean>;
  loading: boolean;
  refetchFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useSupabase();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('listing_id')
        .eq('user_id', user.id);

      if (!error && data) {
        setFavoriteIds(new Set(data.map((item) => item.listing_id)));
      }
    } catch (err) {
      console.error('Error fetching user favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const isFavorited = useCallback(
    (listingId: string) => {
      return favoriteIds.has(listingId);
    },
    [favoriteIds]
  );

  const toggleFavorite = useCallback(
    async (listingId: string): Promise<boolean> => {
      if (!user) return false;

      const currentlyFav = favoriteIds.has(listingId);

      // Optimistic UI update across all components
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (currentlyFav) {
          next.delete(listingId);
        } else {
          next.add(listingId);
        }
        return next;
      });

      try {
        if (currentlyFav) {
          const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('listing_id', listingId);

          if (error) throw error;
          toast.success('Retiré des favoris');
          return false;
        } else {
          const { error } = await supabase
            .from('favorites')
            .upsert(
              { user_id: user.id, listing_id: listingId },
              { onConflict: 'user_id,listing_id' }
            );

          if (error) throw error;
          toast.success('Ajouté aux favoris');
          return true;
        }
      } catch (err) {
        // Revert optimistic state update on failure
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (currentlyFav) {
            next.add(listingId);
          } else {
            next.delete(listingId);
          }
          return next;
        });
        toast.error('Erreur lors de la mise à jour des favoris');
        return currentlyFav;
      }
    },
    [user, favoriteIds]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        isFavorited,
        toggleFavorite,
        loading,
        refetchFavorites: fetchFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
