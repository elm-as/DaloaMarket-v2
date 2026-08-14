import React, { useState } from 'react';
import { MapPin, Calendar, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatPrice } from '../../../lib/utils';
import { ConditionBadge } from '../ConditionBadge';
import DiscountBadge from '../DiscountBadge';
import { getListingStartingPrice } from '../../../types/listing';
import type { ListingFull, ListingVariant } from '../../../types/listing';
import ListingVariantSelector from '../ListingVariantSelector';

interface ListingInfoCardProps {
  listing: ListingFull;
  selectedVariant?: ListingVariant;
  onVariantChange?: (variant: ListingVariant) => void;
}

const ListingInfoCard: React.FC<ListingInfoCardProps> = ({ listing, selectedVariant, onVariantChange }) => {
  const [descExpanded, setDescExpanded] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale: fr });
  const isBoosted = listing.boosted_until && new Date(listing.boosted_until) > new Date();
  const effectivePrice = selectedVariant?.price ?? getListingStartingPrice(listing.price, listing.variants || []);
  const hasDiscount = listing.original_price != null && listing.original_price > effectivePrice;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl shadow-gray-200/50 border border-gray-100/90 space-y-4">
      {/* Price & Discount */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl sm:text-3xl font-black text-orange-600 tracking-tight">
            {listing.variants && listing.variants.length > 0 && !selectedVariant ? (
              <span className="text-xs font-bold text-orange-400 mr-1.5">À partir de</span>
            ) : null}
            {formatPrice(effectivePrice)}
          </span>
          {hasDiscount && listing.original_price && (
            <span className="text-sm font-semibold text-gray-400 line-through">
              {formatPrice(listing.original_price)}
            </span>
          )}
        </div>

        {hasDiscount && listing.original_price && (
          <DiscountBadge originalPrice={listing.original_price} currentPrice={effectivePrice} size="md" />
        )}
      </div>

      {/* Title */}
      <h1 className="text-lg sm:text-xl font-black tracking-tight text-gray-900 leading-snug">
        {listing.title}
      </h1>

      {/* Variants */}
      {listing.variants && listing.variants.length > 0 && onVariantChange && (
        <div className="pt-1">
          <ListingVariantSelector
            variants={listing.variants}
            selectedVariantId={selectedVariant?.id}
            onChange={onVariantChange}
          />
        </div>
      )}

      {/* Meta Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <ConditionBadge condition={listing.condition} />
        {listing.district && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-xl border border-gray-100">
            <MapPin className="h-3.5 w-3.5 text-orange-500" />
            {listing.district}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-xl border border-gray-100">
          <Calendar className="h-3.5 w-3.5 text-gray-400" />
          {timeAgo}
        </span>
        {isBoosted && (
          <span className="inline-flex items-center gap-1 text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
            <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            Sponsorisé
          </span>
        )}
      </div>

      {/* Description */}
      {listing.description && (
        <div className="pt-3 border-t border-gray-100">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
            Description de l'article
          </p>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {descExpanded || listing.description.length <= 220
              ? listing.description
              : `${listing.description.slice(0, 220)}...`}
          </p>
          {listing.description.length > 220 && (
            <button
              type="button"
              onClick={() => setDescExpanded(!descExpanded)}
              className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 mt-2 hover:underline active:scale-95 transition-all"
            >
              <span>{descExpanded ? 'Voir moins' : 'Lire toute la description'}</span>
              {descExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ListingInfoCard;
