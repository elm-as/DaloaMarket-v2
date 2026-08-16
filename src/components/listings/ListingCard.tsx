import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Zap, Plus, Minus, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatPrice, getListingPath, getOptimizedImageUrl, FALLBACK_LISTING_IMAGE } from '../../lib/utils';
import FavoriteButton from './FavoriteButton';
import DiscountBadge from './DiscountBadge';
import { useCart } from '../../context/CartContext';
import { useSupabase } from '../../hooks/useSupabase';
import toast from 'react-hot-toast';
import { getListingStartingPrice } from '../../types/listing';
import type { ListingVariant } from '../../types/listing';

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
  variants?: ListingVariant[];
}

interface ListingCardProps {
  listing: ListingCardData;
  index?: number;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, index = 0 }) => {
  const { addToCart, updateQuantity, removeFromCart, items } = useCart();
  const { user } = useSupabase();
  const navigate = useNavigate();
  const variants = listing.variants || [];
  const hasVariants = variants.length > 0;
  const currentCartQty = hasVariants ? 0 : (listing.cart_qty || 0);
  const isOwner = user?.id === listing.listing_user_id;
  const existingItem = items.find((i) => i.listing_id === listing.id && !i.variant_id);
  const maxQty = hasVariants
    ? variants.reduce((sum, variant) => sum + Math.max(0, variant.stock || 0), 0)
    : (listing.stock ?? 0);
  const displayPrice = hasVariants ? getListingStartingPrice(listing.price, variants) : listing.price;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasVariants) {
      navigate(getListingPath(listing.id, listing.title));
      return;
    }
    if (maxQty <= 0) {
      toast.error('Rupture de stock');
      return;
    }
    try {
      const photo = listing.photos && listing.photos.length > 0 ? listing.photos[0] : '';
      await addToCart(listing.id, listing.title, displayPrice, photo, maxQty, 1);
      toast.success('Ajouté au panier');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'ajout");
    }
  };

  const mainImageRaw =
    listing.photos && listing.photos.length > 0
      ? listing.photos[0]
      : FALLBACK_LISTING_IMAGE;
  const mainImage = getOptimizedImageUrl(mainImageRaw, 320, 75);

  const isBoosted =
    listing.boosted_until && new Date(listing.boosted_until) > new Date();

  const hasDiscount = listing.original_price != null && listing.original_price > displayPrice;

  const relativeTime = formatDistanceToNow(new Date(listing.created_at), {
    addSuffix: true,
    locale: fr,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        delay: index * 0.04,
        ease: [0.2, 0, 0, 1],
      }}
      className="h-full"
    >
      <Link
        to={getListingPath(listing.id, listing.title)}
        className="group h-full flex flex-col bg-white rounded-3xl overflow-hidden border border-gray-100/90 shadow-md shadow-gray-100 hover:shadow-xl hover:border-orange-100 active:scale-[0.98] transition-all duration-200"
        aria-label={`Voir ${listing.title} - ${formatPrice(displayPrice)}`}
      >
        {/* Visual Header */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          <img
            src={mainImage}
            alt={listing.title}
            loading={index < 2 ? 'eager' : 'lazy'}
            {...({ fetchpriority: index < 2 ? 'high' : undefined } as any)}
            decoding="async"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = FALLBACK_LISTING_IMAGE;
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
          />

          {/* Badges Overlay */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">
            {hasDiscount && listing.original_price ? (
              <DiscountBadge originalPrice={listing.original_price} currentPrice={displayPrice} size="sm" />
            ) : isBoosted ? (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <Zap className="h-2.5 w-2.5 fill-current" />
                <span>Boost</span>
              </div>
            ) : null}
          </div>

          {/* Favorite Button */}
          <div className="absolute top-2 right-2 z-10">
            <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center transition-transform active:scale-90 hover:bg-black/40">
              <FavoriteButton listingId={listing.id} isFavorited={listing.is_favorite} />
            </div>
          </div>

          {maxQty <= 0 && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
              <span className="bg-white/95 text-gray-900 text-[11px] font-black px-3 py-1 rounded-full shadow-md">
                Épuisé
              </span>
            </div>
          )}
        </div>

        {/* Info & Pricing */}
        <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between">
          <div className="space-y-1">
            {/* Price Block */}
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-base sm:text-lg font-black tracking-tight text-orange-600">
                {hasVariants && <span className="text-[10px] font-bold text-orange-400 mr-1">Dès</span>}
                {formatPrice(displayPrice)}
              </span>
              {hasDiscount && listing.original_price && (
                <span className="text-[11px] text-gray-400 line-through font-semibold">
                  {formatPrice(listing.original_price)}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-xs sm:text-[13px] text-gray-900 font-bold line-clamp-2 leading-snug group-hover:text-orange-600 transition-colors">
              {listing.title}
            </h3>

            {/* Meta (District & Date) */}
            <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 pt-0.5">
              <MapPin className="h-3 w-3 flex-shrink-0 text-orange-400" />
              <span className="truncate">{listing.district || 'Daloa'}</span>
              <span className="text-gray-300">·</span>
              <span className="truncate">{relativeTime}</span>
            </div>
          </div>

          {/* Quick Cart Action */}
          {!isOwner && maxQty > 0 && (
            <div
              className="pt-2.5 mt-2 border-t border-gray-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {currentCartQty > 0 ? (
                <div className="h-8 flex items-center justify-between rounded-xl bg-orange-50/80 border border-orange-100 p-1">
                  <button
                    onClick={() => {
                      if (!existingItem) return;
                      if (currentCartQty <= 1) {
                        void removeFromCart(existingItem.id);
                        return;
                      }
                      void updateQuantity(existingItem.id, currentCartQty - 1, maxQty);
                    }}
                    className="w-7 h-6 flex items-center justify-center rounded-lg text-orange-600 hover:bg-orange-100 active:scale-95 transition-colors"
                    aria-label="Réduire"
                  >
                    <Minus className="h-3 w-3 stroke-[2.5]" />
                  </button>
                  <span className="text-xs font-black text-gray-900 tabular-nums">{currentCartQty}</span>
                  <button
                    onClick={() => existingItem && updateQuantity(existingItem.id, currentCartQty + 1, maxQty)}
                    disabled={currentCartQty >= maxQty}
                    className="w-7 h-6 flex items-center justify-center rounded-lg bg-orange-600 text-white disabled:opacity-40 active:scale-95 transition-colors"
                    aria-label="Augmenter"
                  >
                    <Plus className="h-3 w-3 stroke-[2.5]" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddToCart}
                  className="w-full h-8 rounded-xl bg-gray-50 hover:bg-orange-500 text-gray-700 hover:text-white border border-gray-200/80 hover:border-transparent text-[11px] font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all duration-150 shadow-2xs"
                  aria-label="Ajouter au panier"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>{hasVariants ? 'Options' : 'Ajouter'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

export { ListingCard };
export default ListingCard;
