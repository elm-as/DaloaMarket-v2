import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { ListingVariant } from '../../../types/listing';

interface ConfiguredVariantsListProps {
  variants: ListingVariant[];
  onClearAll: () => void;
  onUpdateStock: (id: string, delta: number) => void;
  onUpdatePrice: (id: string, price: number | null) => void;
  onRemove: (id: string) => void;
}

export const ConfiguredVariantsList: React.FC<ConfiguredVariantsListProps> = ({
  variants,
  onClearAll,
  onUpdateStock,
  onUpdatePrice,
  onRemove,
}) => {
  if (variants.length === 0) return null;

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          Options configurées ({variants.length})
        </span>
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors"
        >
          Effacer tout
        </button>
      </div>

      <div className="space-y-2">
        {variants.map((variant) => (
          <div
            key={variant.id}
            className="flex flex-wrap sm:flex-nowrap items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-gray-50/80 border border-gray-100 hover:border-gray-200 transition-all gap-2.5"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1 basis-36">
              {variant.color_code ? (
                <span
                  className={cn(
                    'w-3.5 h-3.5 rounded-full shrink-0',
                    variant.color_code.toLowerCase() === '#ffffff' && 'border border-gray-300'
                  )}
                  style={{ backgroundColor: variant.color_code }}
                />
              ) : (
                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
              )}
              <span className="text-xs font-bold text-gray-900 truncate">{variant.label}</span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center bg-white border border-gray-200 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => onUpdateStock(variant.id, -1)}
                  disabled={variant.stock <= 1}
                  className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                  aria-label={`Diminuer le stock pour ${variant.label}`}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-7 text-center text-xs font-black text-gray-900 tabular-nums">
                  {variant.stock}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateStock(variant.id, 1)}
                  className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg"
                  aria-label={`Augmenter le stock pour ${variant.label}`}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <div className="relative w-24">
                <input
                  type="number"
                  min="300"
                  value={variant.price ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdatePrice(variant.id, val === '' ? null : Number(val));
                  }}
                  placeholder="Prix base"
                  aria-label={`Prix spécifique pour ${variant.label}`}
                  className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 pr-5 text-[11px] font-semibold text-gray-900 tabular-nums placeholder:text-[10px] placeholder:text-gray-400 focus:border-orange-500 focus:outline-none"
                />
                <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400">
                  F
                </span>
              </div>

              <button
                type="button"
                onClick={() => onRemove(variant.id)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                aria-label={`Supprimer ${variant.label}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
