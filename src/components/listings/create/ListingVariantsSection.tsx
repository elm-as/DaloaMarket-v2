import React, { useEffect, useState } from 'react';
import { Palette, Shirt, Footprints, Tag, X, Check, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import type { ListingVariant } from '../../../types/listing';
import { generateUuidV4 } from '../../../lib/uuid';
import {
  PRESET_CLOTHING_SIZES,
  PRESET_COLORS,
  PRESET_SHOE_SIZES,
  PRESET_STORAGE_SIZES,
  getRecommendedVariantTab,
  mergeUniqueVariants,
  type VariantDrawerTab,
} from './variantPresets';
import { VariantCombinationBuilder } from './VariantCombinationBuilder';
import { ConfiguredVariantsList } from './ConfiguredVariantsList';

export { PRESET_COLORS, PRESET_CLOTHING_SIZES, PRESET_SHOE_SIZES, PRESET_STORAGE_SIZES };

interface ListingVariantsSectionProps {
  variants: ListingVariant[];
  category?: string;
  onChange: (variants: ListingVariant[]) => void;
}

const OPTION_TABS: { key: VariantDrawerTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { key: 'clothing_size', label: 'Tailles', Icon: Shirt },
  { key: 'shoe_size', label: 'Pointures', Icon: Footprints },
  { key: 'color', label: 'Couleurs', Icon: Palette },
  { key: 'combo', label: 'Couleur + Taille', Icon: Layers },
  { key: 'custom', label: 'Capacité / Autre', Icon: Tag },
];

export const ListingVariantsSection: React.FC<ListingVariantsSectionProps> = ({
  variants,
  category,
  onChange,
}) => {
  const recommendedTab = getRecommendedVariantTab(category);
  const [activeDrawer, setActiveDrawer] = useState<VariantDrawerTab | null>(recommendedTab);
  const [customInput, setCustomInput] = useState('');

  useEffect(() => {
    setActiveDrawer((prev) => (prev === null ? null : getRecommendedVariantTab(category)));
  }, [category]);

  const handleTogglePreset = (payload: {
    label: string;
    color?: string | null;
    color_code?: string | null;
    size?: string | null;
  }) => {
    const key = payload.label.toLowerCase();
    const existing = variants.find((v) => v.label.toLowerCase() === key);
    if (existing) {
      onChange(variants.filter((v) => v.id !== existing.id));
      return;
    }

    onChange([
      ...variants,
      {
        id: generateUuidV4(),
        label: payload.label,
        color: payload.color || null,
        color_code: payload.color_code || null,
        size: payload.size || null,
        price: null,
        stock: 1,
        active: true,
      },
    ]);
  };

  const updateStock = (id: string, delta: number) => {
    onChange(
      variants.map((v) => (v.id === id ? { ...v, stock: Math.max(1, v.stock + delta) } : v))
    );
  };

  const updatePrice = (id: string, price: number | null) => {
    onChange(variants.map((v) => (v.id === id ? { ...v, price } : v)));
  };

  const removeVariant = (id: string) => {
    onChange(variants.filter((v) => v.id !== id));
  };

  const submitCustomInput = () => {
    const clean = customInput.trim();
    if (!clean) return;
    handleTogglePreset({ label: clean });
    setCustomInput('');
  };

  const totalUnits = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold text-gray-900 block">
            Options disponibles <span className="text-[11px] font-normal text-gray-500">(Optionnel)</span>
          </span>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
            Touchez directement les tailles, pointures ou couleurs en stock.
          </p>
        </div>

        {variants.length > 0 && (
          <span className="text-xs font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-xl border border-orange-100 tabular-nums">
            {variants.length} option{variants.length > 1 ? 's' : ''} · {totalUnits} unités
          </span>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Types d'options"
        className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 scrollbar-none"
      >
        {OPTION_TABS.map(({ key, label, Icon }) => {
          const isOpen = activeDrawer === key;
          const isSuggested = recommendedTab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isOpen}
              onClick={() => setActiveDrawer(isOpen ? null : key)}
              className={cn(
                'min-h-[42px] shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border',
                isOpen
                  ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                  : isSuggested
                  ? 'bg-orange-50/70 border-orange-200 text-orange-800 hover:border-orange-300'
                  : 'bg-gray-50/80 border-gray-200/80 text-gray-700 hover:border-orange-200'
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {activeDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3.5 rounded-2xl bg-orange-50/40 border border-orange-100 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-gray-700">
                  {activeDrawer === 'color' && 'Touchez une couleur pour l’ajouter ou la retirer :'}
                  {activeDrawer === 'clothing_size' && 'Touchez les tailles disponibles :'}
                  {activeDrawer === 'shoe_size' && 'Touchez les pointures disponibles :'}
                  {activeDrawer === 'combo' && 'Générer plusieurs combinaisons d’un coup :'}
                  {activeDrawer === 'custom' && 'Capacités rapides ou option personnalisée :'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveDrawer(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Fermer le panneau d'options"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {activeDrawer === 'color' && (
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((c) => {
                    const isSelected = variants.some((v) => v.label.toLowerCase() === c.name.toLowerCase());
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => handleTogglePreset({ label: c.name, color: c.name, color_code: c.code })}
                        className={cn(
                          'min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border active:scale-95',
                          isSelected
                            ? 'bg-orange-100 border-orange-400 text-orange-950'
                            : 'bg-white border-gray-200 hover:border-orange-300 text-gray-800'
                        )}
                      >
                        <span
                          className={cn('w-3 h-3 rounded-full shrink-0', c.border && 'border border-gray-300')}
                          style={{ backgroundColor: c.code }}
                        />
                        <span>{c.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-orange-600 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {(activeDrawer === 'clothing_size' || activeDrawer === 'shoe_size') && (
                <div className="flex flex-wrap gap-1.5">
                  {(activeDrawer === 'clothing_size' ? PRESET_CLOTHING_SIZES : PRESET_SHOE_SIZES).map((size) => {
                    const isSelected = variants.some((v) => v.label.toLowerCase() === size.toLowerCase());
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleTogglePreset({ label: size, size })}
                        className={cn(
                          'min-h-[40px] min-w-[46px] px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border active:scale-95 tabular-nums inline-flex items-center justify-center gap-1',
                          isSelected
                            ? 'bg-orange-100 border-orange-400 text-orange-950'
                            : 'bg-white border-gray-200 hover:border-orange-300 text-gray-800'
                        )}
                      >
                        <span>{size}</span>
                        {isSelected && <Check className="w-3 h-3 text-orange-600" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeDrawer === 'combo' && (
                <VariantCombinationBuilder
                  onGenerate={(generated) => onChange(mergeUniqueVariants(variants, generated))}
                />
              )}

              {activeDrawer === 'custom' && (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_STORAGE_SIZES.map((storage) => {
                      const isSelected = variants.some((v) => v.label.toLowerCase() === storage.toLowerCase());
                      return (
                        <button
                          key={storage}
                          type="button"
                          onClick={() => handleTogglePreset({ label: storage, size: storage })}
                          className={cn(
                            'min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-bold active:scale-95 transition-all',
                            isSelected
                              ? 'bg-orange-100 border-orange-400 text-orange-950'
                              : 'bg-white border-gray-200 hover:border-orange-300 text-gray-800'
                          )}
                        >
                          {storage}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <label htmlFor="custom-variant-input" className="sr-only">
                      Nom de l&apos;option personnalisée
                    </label>
                    <input
                      id="custom-variant-input"
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          submitCustomInput();
                        }
                      }}
                      placeholder="ex: Pack de 3, Coton, Modèle Pro..."
                      className="flex-1 h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={submitCustomInput}
                      disabled={!customInput.trim()}
                      className="min-h-[40px] px-4 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfiguredVariantsList
        variants={variants}
        onClearAll={() => onChange([])}
        onUpdateStock={updateStock}
        onUpdatePrice={updatePrice}
        onRemove={removeVariant}
      />
    </div>
  );
};

export default ListingVariantsSection;
