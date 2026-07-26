import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSupabase } from '../../hooks/useSupabase';
import { useFavorites } from '../../contexts/FavoritesContext';

interface FavoriteButtonProps {
  listingId: string;
  isFavorited?: boolean;
  onToggle?: () => void;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  listingId,
  isFavorited: propIsFavorited,
  onToggle,
}) => {
  const { user } = useSupabase();
  const navigate = useNavigate();
  const { isFavorited, toggleFavorite } = useFavorites();
  const [loading, setLoading] = useState(false);

  // If context has loaded favorites, use context state, otherwise prop fallback
  const fav = isFavorited(listingId) ?? propIsFavorited ?? false;

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate('/login', { state: { from: `/listings/${listingId}` } });
      return;
    }

    setLoading(true);
    try {
      await toggleFavorite(listingId);
      onToggle?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={toggle}
      disabled={loading}
      whileTap={{ scale: 0.85 }}
      animate={{ scale: fav ? [1, 1.3, 1] : 1 }}
      transition={{ duration: 0.3 }}
      className="inline-flex items-center justify-center p-1.5 rounded-full"
      aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Heart
        className="h-5 w-5 drop-shadow-sm"
        fill={fav ? '#EF4444' : 'none'}
        stroke={fav ? '#EF4444' : 'white'}
        strokeWidth={2}
      />
    </motion.button>
  );
};

export default FavoriteButton;
