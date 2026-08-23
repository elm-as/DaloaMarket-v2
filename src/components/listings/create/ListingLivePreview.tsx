import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, ShoppingBag, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { formatPrice, CATEGORIES, CONDITIONS } from '../../../lib/utils';

interface ListingLivePreviewProps {
  title: string;
  price: string;
  originalPrice?: string;
  category: string;
  condition: string;
  district: string;
  photos: File[];
  existingPhotos: string[];
  discountPercent: number;
  sellerName?: string;
  isPro?: boolean;
}

export const ListingLivePreview: React.FC<ListingLivePreviewProps> = ({
  title,
  price,
  originalPrice,
  category,
  condition,
  district,
  photos,
  existingPhotos,
  discountPercent,
  sellerName = 'Vous',
  isPro = false,
}) => {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (existingPhotos.length > 0) {
      setPreviewUrl(existingPhotos[0]);
    } else if (photos.length > 0 && photos[0] instanceof Blob) {
      const url = URL.createObjectURL(photos[0]);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [existingPhotos, photos]);

  const imagePreviewUrl = previewUrl;
  const priceNum = parseInt(price, 10);
  const origPriceNum = parseInt(originalPrice || '', 10);
  const categoryObj = CATEGORIES.find((c) => c.id === category);
  const conditionObj = CONDITIONS.find((c) => c.id === condition);

  return (
    <div className="space-y-3 select-none">
      {/* ── CARD MOCKUP ── */}
      <motion.div
        className="bg-white rounded-3xl overflow-hidden shadow-md shadow-gray-100 border border-gray-100/90 relative"
        layout
      >
        {/* Photo Area */}
        <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
          {imagePreviewUrl ? (
            <img
              src={imagePreviewUrl}
              alt={title || 'Aperçu'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-300 p-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-200/50 flex items-center justify-center mb-2 text-gray-400">
                <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="text-[11px] font-bold text-gray-400">Aperçu photo</p>
            </div>
          )}

          {/* Badges Overlay */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
            {discountPercent > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm">
                -{discountPercent}%
              </span>
            )}
            {conditionObj && (
              <span className="bg-black/65 backdrop-blur-md text-white text-[10px] font-extrabold px-2 py-0.5 rounded-lg shadow-xs">
                {conditionObj.label}
              </span>
            )}
          </div>

          {/* Category Chip */}
          {categoryObj && (
            <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-md text-gray-800 text-[10px] font-black px-2 py-0.5 rounded-lg shadow-xs border border-white/50">
              {categoryObj.label}
            </div>
          )}
        </div>

        {/* Content Info Area */}
        <div className="p-3.5 space-y-2">
          {/* Price Row */}
          <div className="flex items-baseline gap-2">
            <span className="text-base font-black text-orange-600">
              {!isNaN(priceNum) && priceNum > 0 ? formatPrice(priceNum) : '0 FCFA'}
            </span>
            {!isNaN(origPriceNum) && origPriceNum > priceNum && priceNum > 0 && (
              <span className="text-xs text-gray-400 line-through font-semibold">
                {formatPrice(origPriceNum)}
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className="text-xs font-black text-gray-900 line-clamp-1">
            {title.trim() || 'Titre de votre annonce'}
          </h4>

          {/* Footer details */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] font-semibold text-gray-500">
            <div className="flex items-center gap-1 truncate text-gray-600">
              <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
              <span className="truncate">{district || 'Daloa'}</span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-gray-800 font-bold">{sellerName}</span>
              {isPro && (
                <span className="w-3.5 h-3.5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[8px] font-black">
                  ✓
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ListingLivePreview;
