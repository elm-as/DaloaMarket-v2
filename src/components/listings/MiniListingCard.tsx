import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Zap, Edit3, CheckCircle2, Trash2 } from 'lucide-react';
import { formatPrice, getListingPath } from '../../lib/utils';

interface MiniListingCardProps {
  listing: {
    id: string;
    title: string;
    price: number;
    photos: string[];
    status: string;
    boosted_until?: string | null;
  };
  onMarkSold: (id: string) => void;
  onDelete: (id: string) => void;
  onBoost?: (id: string) => void;
  loadingBoost?: boolean;
  isProSeller?: boolean;
  hasActiveBoost?: boolean;
}

const MiniListingCard: React.FC<MiniListingCardProps> = ({
  listing,
  onMarkSold,
  onDelete,
  onBoost,
  loadingBoost = false,
}) => {
  const navigate = useNavigate();
  const isBoosted = listing.boosted_until && new Date(listing.boosted_until) > new Date();
  const isActive = listing.status === 'active';
  const isSold = listing.status === 'sold';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-gray-100/90 shadow-md shadow-gray-100 hover:shadow-lg overflow-hidden transition-all flex flex-col justify-between"
    >
      <div>
        {/* Clickable Image Area */}
        <div
          onClick={() => navigate(getListingPath(listing.id, listing.title))}
          className="cursor-pointer group relative aspect-[4/3] bg-gray-100 overflow-hidden"
        >
          {listing.photos && listing.photos[0] ? (
            <img
              src={listing.photos[0]}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Package className="w-8 h-8 opacity-40" />
            </div>
          )}

          {/* Boost Badge */}
          {isBoosted && (
            <div className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Zap className="w-2.5 h-2.5 fill-current" />
              <span>Boost</span>
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-2 right-2">
            <span
              className={`px-2 py-0.5 text-[10px] font-black rounded-full shadow-2xs ${
                isActive
                  ? 'bg-emerald-500 text-white'
                  : isSold
                  ? 'bg-gray-800 text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {isActive ? 'Actif' : isSold ? 'Vendu' : listing.status}
            </span>
          </div>
        </div>

        {/* Title & Price */}
        <div
          onClick={() => navigate(getListingPath(listing.id, listing.title))}
          className="p-3 pb-1 cursor-pointer group"
        >
          <p className="text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
            {listing.title}
          </p>
          <p className="text-sm font-black text-orange-600 mt-0.5">
            {formatPrice(listing.price)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-3 pt-1 space-y-2">
        <div className="flex items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/create-listing?id=${listing.id}`);
            }}
            className="flex-1 h-7 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-black flex items-center justify-center gap-1 active:scale-95 transition-all"
            title="Modifier l'annonce"
          >
            <Edit3 className="w-3 h-3" />
            <span>Modifier</span>
          </button>

          {isActive && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMarkSold(listing.id);
              }}
              className="flex-1 h-7 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 text-[10px] font-black flex items-center justify-center gap-1 active:scale-95 transition-all"
              title="Marquer comme vendu"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Vendu</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(listing.id);
            }}
            className="w-7 h-7 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center active:scale-95 transition-all"
            title="Supprimer l'annonce"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Boost CTA */}
        {isActive && onBoost && (
          <div>
            {isBoosted ? (
              <div className="w-full bg-amber-50 text-amber-700 rounded-xl py-1 px-2 flex items-center justify-center gap-1 border border-amber-200/50 text-[10px] font-black">
                <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>Boost actif</span>
              </div>
            ) : (
              <button
                type="button"
                disabled={loadingBoost}
                onClick={(e) => {
                  e.stopPropagation();
                  onBoost(listing.id);
                }}
                className="w-full h-7 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-[10px] font-black shadow-xs flex items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-50"
              >
                <Zap className="w-3 h-3 fill-white" />
                <span>{loadingBoost ? 'Boost en cours...' : 'Booster l\'annonce'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MiniListingCard;
