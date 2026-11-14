import React, { useState } from 'react';
import { Check, Layers } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { ListingVariant } from '../../../types/listing';
import {
  PRESET_CLOTHING_SIZES,
  PRESET_COLORS,
  PRESET_SHOE_SIZES,
  buildVariantCombinations,
  type PresetColor,
} from './variantPresets';

interface VariantCombinationBuilderProps {
  onGenerate: (generated: ListingVariant[]) => void;
}

export const VariantCombinationBuilder: React.FC<VariantCombinationBuilderProps> = ({
  onGenerate,
}) => {
  const [selectedColors, setSelectedColors] = useState<PresetColor[]>([]);
  const [sizeKind, setSizeKind] = useState<'clothing' | 'shoe'>('clothing');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [stockPerItem, setStockPerItem] = useState<number>(1);

  const toggleColor = (color: PresetColor) => {
    setSelectedColors((prev) =>
      prev.some((c) => c.name === color.name)
        ? prev.filter((c) => c.name !== color.name)
        : [...prev, color]
    );
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleSizeKindChange = (nextKind: 'clothing' | 'shoe') => {
    if (nextKind === sizeKind) return;
    setSizeKind(nextKind);
    setSelectedSizes([]);
  };

  const sizeList = sizeKind === 'clothing' ? PRESET_CLOTHING_SIZES : PRESET_SHOE_SIZES;
  const generatedCount =
    selectedColors.length > 0 && selectedSizes.length > 0
      ? selectedColors.length * selectedSizes.length
      : selectedColors.length + selectedSizes.length;

  const handleApply = () => {
    if (generatedCount === 0) return;
    const next = buildVariantCombinations({
      colors: selectedColors,
      sizes: selectedSizes,
      stockPerVariant: stockPerItem,
      priceOverride: null,
    });
    onGenerate(next);
    setSelectedColors([]);
    setSelectedSizes([]);
  };

  return (
    <div className="space-y-3.5">
      <div>
        <span className="block text-[11px] font-bold text-gray-800 mb-1.5">
          1. Cochez une ou plusieurs couleurs
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((c) => {
            const active = selectedColors.some((item) => item.name === c.name);
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => toggleColor(c)}
                className={cn(
                  'min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95',
                  active
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-white border-gray-200 text-gray-800 hover:border-orange-300'
                )}
              >
                <span
                  className={cn('w-3 h-3 rounded-full shrink-0', c.border && 'border border-gray-300')}
                  style={{ backgroundColor: c.code }}
                />
                <span>{c.name}</span>
                {active && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-bold text-gray-800">
            2. Cochez les {sizeKind === 'clothing' ? 'tailles' : 'pointures'}
          </span>
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => handleSizeKindChange('clothing')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors',
                sizeKind === 'clothing' ? 'bg-gray-900 text-white' : 'text-gray-600'
              )}
            >
              Tailles
            </button>
            <button
              type="button"
              onClick={() => handleSizeKindChange('shoe')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors',
                sizeKind === 'shoe' ? 'bg-gray-900 text-white' : 'text-gray-600'
              )}
            >
              Pointures
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sizeList.map((size) => {
            const active = selectedSizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={cn(
                  'min-h-[38px] min-w-[44px] px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all active:scale-95 tabular-nums',
                  active
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-white border-gray-200 text-gray-800 hover:border-orange-300'
                )}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-orange-200/70">
        <div className="flex items-center gap-2">
          <label htmlFor="combo-stock-input" className="text-xs font-semibold text-gray-700">
            Stock par option :
          </label>
          <input
            id="combo-stock-input"
            type="number"
            min={1}
            max={999}
            value={stockPerItem}
            onChange={(e) => setStockPerItem(Math.max(1, Number(e.target.value) || 1))}
            className="w-20 h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-900 tabular-nums focus:border-orange-500 focus:outline-none"
          />
        </div>

        <button
          type="button"
          disabled={generatedCount === 0}
          onClick={handleApply}
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-gray-200 disabled:text-gray-500 text-white text-xs font-bold transition-colors tabular-nums"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>
            {generatedCount > 0
              ? `Ajouter ${generatedCount} option${generatedCount > 1 ? 's' : ''}`
              : 'Sélectionnez couleur ou taille'}
          </span>
        </button>
      </div>
    </div>
  );
};
