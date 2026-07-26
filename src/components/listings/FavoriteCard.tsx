import React from 'react';
import { Package } from 'lucide-react';
import { formatPrice } from '../../lib/utils';

interface FavoriteCardProps {
  listing: {
    id: string;
    title: string;
    price: number;
    photos: string[];
    condition?: string;
  };
  onClick: () => void;
}

const FavoriteCard: React.FC<FavoriteCardProps> = ({ listing, onClick }) => {
  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-[var(--elevation-1)] hover:shadow-[var(--elevation-2)] overflow-hidden active:scale-[0.97] transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
        {listing.photos && listing.photos[0] ? (
          <img
            src={listing.photos[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Package className="w-10 h-10" />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-semibold text-gray-900 line-clamp-1">
          {listing.title}
        </p>
        <p className="text-sm font-bold text-primary mt-0.5">
          {formatPrice(listing.price)}
        </p>
      </div>
    </div>
  );
};

export default FavoriteCard;
