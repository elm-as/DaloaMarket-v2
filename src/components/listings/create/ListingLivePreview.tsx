import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Sparkles, ShoppingBag, ShieldCheck, Eye } from 'lucide-react';
import { formatPrice } from '../../../lib/utils';
import { CATEGORIES } from '../../../lib/utils';

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

  return (
    <div className="space-y-3">
      {/* HEADER */}
      <div className="flex items-center gap-2.5 px-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-50 dark:bg-orange-950/30 text-[#FF7F00]">
          <Eye className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">Aperçu en direct</h2>
          <p className="text-[11px] text-gray-500">Vérifiez le rendu final de votre annonce</p>
        </div>
      </div>

      {/* MOCKUP CARD */}
      <motion.div
        className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 max-w-xs mx-auto relative group"
        layout
      >
        {/* Image Preview Container */}
        <div className="relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
          {imagePreviewUrl ? (
            <img
              src={imagePreviewUrl}
              alt={title || 'Aperçu'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-300 p-4 text-center">
              <ShoppingBag className="w-10 h-10 mb-1.5 stroke-[1.5]" />
              <p className="text-[10px] font-semibold text-gray-400">Aucune photo principale</p>
            </div>
          )}

          {/* Badges Overlay */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
            {discountPercent > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                -{discountPercent}%
              </span>
            )}
            {condition && (
              <span className="bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded capitalize">
                {condition === 'new' ? 'Neuf' : condition === 'like_new' ? 'Comme neuf' : condition === 'good' ? 'Bon état' : 'Occasion'}
              </span>
            )}
          </div>

          {/* Category Badge Right */}
          {categoryObj && (
            <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-md text-gray-800 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              {categoryObj.label}
            </div>
          )}
        </div>

        {/* Info Content */}
        <div className="p-3 space-y-1.5">
          {/* Seller Tag */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-semibold text-gray-400 truncate">{sellerName}</span>
            {isPro && (
              <span className="inline-flex items-center gap-0.5 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full">
                <ShieldCheck className="w-2 h-2" /> PRO
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-bold text-xs text-gray-800 line-clamp-2 leading-tight">
            {title || 'Titre de votre produit ou service'}
          </h3>

          {/* Price & Location */}
          <div className="flex items-end justify-between pt-1">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-black text-sm text-[#FF7F00]">
                  {!isNaN(priceNum) && priceNum > 0 ? formatPrice(priceNum) : '0 FCFA'}
                </span>
                {!isNaN(origPriceNum) && origPriceNum > priceNum && priceNum > 0 && (
                  <span className="text-[10px] text-gray-400 line-through">
                    {formatPrice(origPriceNum)}
                  </span>
                )}
              </div>
            </div>

            {district && (
              <div className="flex items-center gap-0.5 text-[9px] font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                <MapPin className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                <span className="truncate max-w-[70px]">{district}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
