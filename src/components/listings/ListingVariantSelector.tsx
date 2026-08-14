import React from 'react';
import { Layers, Palette, Ruler, Check } from 'lucide-react';
import { cn, formatPrice } from '../../lib/utils';
import type { ListingVariant } from '../../types/listing';

interface ListingVariantSelectorProps {
  variants?: ListingVariant[];
  selectedVariantId?: string;
  onChange: (variant: ListingVariant) => void;
}

export const ListingVariantSelector: React.FC<ListingVariantSelectorProps> = ({
  variants = [],
  selectedVariantId,
  onChange,
}) => {
  const availableVariants = variants.filter((variant) => variant.active !== false && variant.stock > 0);

  if (variants.length === 0) return null;

  const hasColors = availableVariants.some((v) => !!v.color || !!v.color_code);

  return (
    <div className="rounded-3xl border border-orange-100 bg-orange-50/40 p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-extrabold text-gray-800">
          {hasColors ? (
            <Palette className="h-4 w-4 text-orange-500" />
          ) : (
            <Ruler className="h-4 w-4 text-orange-500" />
          )}
          <span>{hasColors ? 'Choisissez une couleur / taille' : 'Choisissez une taille'}</span>
        </span>
        {!selectedVariantId ? (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
            Requis
          </span>
        ) : (
          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
            <Check size={12} strokeWidth={3} /> Sélectionné
          </span>
        )}
      </div>

      {availableVariants.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {availableVariants.map((variant) => {
            const isSelected = variant.id === selectedVariantId;
            const hasColorDot = !!variant.color_code;

            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => onChange(variant)}
                className={cn(
                  'min-h-[42px] px-3.5 py-2 rounded-2xl border text-xs font-extrabold transition-all flex items-center gap-2 active:scale-95 shadow-2xs',
                  isSelected
                    ? 'border-orange-500 bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/20'
                    : 'border-orange-200/80 bg-white text-gray-800 hover:border-orange-400 hover:text-orange-600'
                )}
              >
                {hasColorDot && (
                  <span
                    className={cn(
                      'w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-inner',
                      variant.color_code?.toLowerCase() === '#ffffff' && 'border border-gray-300'
                    )}
                    style={{ backgroundColor: variant.color_code || undefined }}
                  />
                )}
                <span>{variant.label || variant.size || variant.color || 'Option'}</span>
                {variant.price != null && (
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                      isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {formatPrice(variant.price)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs font-semibold text-red-600">Toutes les options sont actuellement en rupture de stock.</p>
      )}
    </div>
  );
};

export default ListingVariantSelector;
