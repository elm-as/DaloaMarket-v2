import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Zap } from 'lucide-react';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
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
  isProSeller = false,
  hasActiveBoost = false,
}) => {
  const navigate = useNavigate();
  const isBoosted = listing.boosted_until && new Date(listing.boosted_until) > new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-[var(--elevation-1)] hover:shadow-[var(--elevation-2)] overflow-hidden active:scale-[0.97] transition-all flex flex-col justify-between"
    >
      <div>
        <div
          onClick={() => navigate(getListingPath(listing.id, listing.title))}
          className="cursor-pointer group"
        >
          <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative">
            {listing.photos && listing.photos[0] ? (
              <img
                src={listing.photos[0]}
                alt={listing.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Package className="w-10 h-10" />
              </div>
            )}
            
            {isBoosted && (
              <div className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm border border-amber-400/20">
                <Zap className="w-2.5 h-2.5 fill-white" /> Sponsorisé
              </div>
            )}

            <Chip
              color={listing.status === 'active' ? 'success' : 'warning'}
              size="sm"
              selected
              className="absolute top-2 right-2"
            >
              {listing.status === 'active' ? 'Actif' : listing.status === 'sold' ? 'Vendu' : listing.status}
            </Chip>
          </div>
          <div className="p-2.5 pb-0">
            <p className="text-xs font-semibold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">{listing.title}</p>
            <p className="text-sm font-bold text-primary mt-0.5">{formatPrice(listing.price)}</p>
          </div>
        </div>
        <div className="p-2.5 pt-1.5">
          <div className="flex items-center gap-1.5 mt-2">
            <Button
              variant="tonal"
              color="primary"
              size="sm"
              className="text-[10px] h-7 px-2"
              onClick={(e) => { e.stopPropagation(); navigate(`/create-listing?id=${listing.id}`); }}
            >
              Modifier
            </Button>
            {listing.status === 'active' && (
              <Button
                variant="tonal"
                color="success"
                size="sm"
                className="text-[10px] h-7 px-2"
                onClick={(e) => { e.stopPropagation(); onMarkSold(listing.id); }}
              >
                Vendu
              </Button>
            )}
            <Button
              variant="tonal"
              color="error"
              size="sm"
              className="text-[10px] h-7 px-2"
              onClick={(e) => { e.stopPropagation(); onDelete(listing.id); }}
            >
              Suppr.
            </Button>
          </div>
        </div>
      </div>

      {listing.status === 'active' && onBoost && (
        <div className="px-2.5 pb-2.5">
          {isBoosted ? (
            <div className="w-full bg-amber-50 text-amber-700 rounded-xl py-1.5 px-3 flex items-center justify-center gap-1 border border-amber-200/50 text-[11px] font-semibold">
              <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Boost actif
            </div>
          ) : (
            <Button
              variant="filled"
              color="primary"
              size="sm"
              fullWidth
              loading={loadingBoost}
              disabled={loadingBoost}
              className="h-8 text-[11px] font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-sm flex items-center justify-center gap-1 border-0"
              onClick={() => onBoost(listing.id)}
            >
              <Zap className="w-3.5 h-3.5 fill-white text-white" />
              Booster
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default MiniListingCard;
