import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Zap, Heart, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatPrice, cn, getListingPath } from '../../lib/utils';
import FavoriteButton from './FavoriteButton';
import DiscountBadge from './DiscountBadge';
import { useCart } from '../../context/CartContext';
import { useSupabase } from '../../hooks/useSupabase';
import toast from 'react-hot-toast';

export interface ListingCardData {
  id: string;
  title: string;
  price: number;
  photos: string[];
  created_at: string;
  district: string;
  condition: string;
  category: string;
  boosted_until: string | null;
  seller: {
    name: string;
    avatar: string | null;
  };
  is_favorite: boolean;
  cart_qty?: number;
  stock: number;
  listing_user_id: string;
  original_price: number | null;
}

interface ListingCardProps {
  listing: ListingCardData;
  index?: number;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, index = 0 }) => {
  const { addToCart, updateQuantity, removeFromCart, items } = useCart();
  const { user } = useSupabase();

  const currentCartQty = listing.cart_qty || 0;
  const isOwner = user?.id === listing.listing_user_id;
  const existingItem = items.find(i => i.listing_id === listing.id);
  const maxQty = listing.stock ?? 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (maxQty <= 0) {
      toast.error('Rupture de stock');
      return;
    }
    try {
      const photo = listing.photos && listing.photos.length > 0 ? listing.photos[0] : '';
      await addToCart(listing.id, listing.title, listing.price, photo, maxQty, 1);
      toast.success('Ajouté au panier');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'ajout");
    }
  };
  const mainImage =
    listing.photos && listing.photos.length > 0
      ? listing.photos[0]
      : 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=400';

  const isBoosted =
    listing.boosted_until && new Date(listing.boosted_until) > new Date();

  const hasDiscount = listing.original_price != null && listing.original_price > listing.price;

  const relativeTime = formatDistanceToNow(new Date(listing.created_at), {
    addSuffix: true,
    locale: fr,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.06,
        ease: [0.2, 0, 0, 1],
      }}
      className="h-full"
    >
      <Link
        to={getListingPath(listing.id, listing.title)}
        className="group h-full flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg active:scale-[0.97] transition-all duration-200"
        style={{ boxShadow: 'var(--elevation-1)' }}
        aria-label={`Voir ${listing.title} - ${formatPrice(listing.price)}`}
      >
        {/* Image section */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          <img
            src={mainImage}
            alt={listing.title}
            loading={index < 2 ? 'eager' : 'lazy'}
            {...({ fetchpriority: index < 2 ? 'high' : undefined } as any)}
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

          {/* Price */}
          <div className="absolute bottom-2 left-3 flex flex-col">
            {hasDiscount && listing.original_price && (
              <span className="text-white/60 text-xs line-through drop-shadow-md">
                {formatPrice(listing.original_price)}
              </span>
            )}
            <span className="text-white font-bold text-lg drop-shadow-md">
              {formatPrice(listing.price)}
            </span>
          </div>

          {/* Discount badge (≥50% → rouge) */}
          {hasDiscount && listing.original_price && (
            <div className="absolute top-2 left-2">
              <DiscountBadge originalPrice={listing.original_price} currentPrice={listing.price} size="sm" />
            </div>
          )}

          {/* Boosted badge */}
          {!hasDiscount && isBoosted && (
            <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
              <Zap className="h-3 w-3" />
              Boost
            </div>
          )}

          {/* Favorite button */}
          <div className="absolute top-2 right-2">
            <div className="w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
              <FavoriteButton
                listingId={listing.id}
                isFavorited={listing.is_favorite}
              />
            </div>
          </div>
        </div>

        {/* Content section */}
        <div className="p-3 space-y-2 flex-1">
          {/* Title */}
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {listing.title}
          </h3>

          {/* District chip + date */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
              <span className="truncate">{listing.district}</span>
            </div>
            <span className="text-[11px] text-gray-400 flex-shrink-0">
              {relativeTime}
            </span>
          </div>

          {/* Seller info */}
          <div className="flex items-center justify-end gap-1.5 pt-1">
            <span className="text-[11px] text-gray-400 truncate max-w-[80px]">
              {listing.seller.name}
            </span>
            <div
              className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500 flex-shrink-0"
            >
              {listing.seller.name
                ? listing.seller.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : '?'}
            </div>
          </div>
        </div>

        {/* Cart section */}
        {!isOwner && (
          currentCartQty > 0 ? (
            <div className="px-3 pb-3" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-[var(--color-surface-variant)] rounded-full p-0.5">
                  <button
                    onClick={() => existingItem && updateQuantity(existingItem.id, currentCartQty - 1)}
                    disabled={currentCartQty <= 1}
                    className="min-w-[28px] min-h-[28px] flex items-center justify-center rounded-full text-[var(--color-on-surface)] hover:bg-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Réduire la quantité"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="min-w-[20px] text-center text-[12px] font-semibold text-[var(--color-on-surface)] tabular-nums">
                    {currentCartQty}
                  </span>
                  <button
                    onClick={() => existingItem && updateQuantity(existingItem.id, currentCartQty + 1, maxQty)}
                    disabled={currentCartQty >= maxQty}
                    className="min-w-[28px] min-h-[28px] flex items-center justify-center rounded-full text-[var(--color-on-surface)] hover:bg-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Augmenter la quantité"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button
                  onClick={() => existingItem && removeFromCart(existingItem.id)}
                  className="min-w-[28px] min-h-[28px] flex items-center justify-center rounded-full text-[var(--color-on-surface-variant)] hover:text-red-500 hover:bg-red-50 transition-colors"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="px-3 pb-3" onClick={(e) => e.preventDefault()}>
              <button
                className="w-full py-2 rounded-xl bg-[var(--color-primary-50)] text-[var(--color-primary)] text-xs font-semibold hover:bg-[var(--color-primary-100)] active:scale-[0.97] transition-all flex items-center justify-center gap-1.5"
                onClick={handleAddToCart}
                disabled={maxQty <= 0}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Ajouter</span>
              </button>
            </div>
          )
        )}
      </Link>
    </motion.div>
  );
};

export { ListingCard };
export default ListingCard;
