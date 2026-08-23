import React, { useState } from 'react';
import { Plus, Palette, Shirt, Footprints, Tag, Trash2, Minus, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import type { ListingVariant } from '../../../types/listing';

interface ListingVariantsSectionProps {
  variants: ListingVariant[];
  onChange: (variants: ListingVariant[]) => void;
}

export const PRESET_COLORS = [
  { name: 'Noir', code: '#111827', border: false },
  { name: 'Blanc', code: '#FFFFFF', border: true },
  { name: 'Rouge', code: '#EF4444', border: false },
  { name: 'Bleu', code: '#3B82F6', border: false },
  { name: 'Vert', code: '#10B981', border: false },
  { name: 'Jaune', code: '#F59E0B', border: false },
  { name: 'Orange', code: '#F97316', border: false },
  { name: 'Rose', code: '#EC4899', border: false },
  { name: 'Gris', code: '#6B7280', border: false },
  { name: 'Marron', code: '#78350F', border: false },
  { name: 'Doré', code: '#D97706', border: false },
  { name: 'Argenté', code: '#94A3B8', border: false },
];

export const PRESET_CLOTHING_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'Unique'];
export const PRESET_SHOE_SIZES = ['37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
export const PRESET_STORAGE_SIZES = ['64 Go', '128 Go', '256 Go', '512 Go'];

const makeVariantId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `variant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
};

type ActiveDrawerType = 'color' | 'clothing_size' | 'shoe_size' | 'custom' | null;

export const ListingVariantsSection: React.FC<ListingVariantsSectionProps> = ({ variants, onChange }) => {
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawerType>(null);
  const [customInput, setCustomInput] = useState('');

  // Ajouter une variante
  const handleAddVariant = (payload: {
    label: string;
    color?: string | null;
    color_code?: string | null;
    size?: string | null;
  }) => {
    // Vérifier si elle n'existe pas déjà
    const exists = variants.some((v) => v.label.toLowerCase() === payload.label.toLowerCase());
    if (exists) {
      // Si déjà existant, incrémenter le stock
      onChange(
        variants.map((v) =>
          v.label.toLowerCase() === payload.label.toLowerCase()
            ? { ...v, stock: v.stock + 1 }
            : v
        )
      );
      return;
    }

    onChange([
      ...variants,
      {
        id: makeVariantId(),
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
      variants.map((v) => {
        if (v.id !== id) return v;
        const newStock = Math.max(1, v.stock + delta);
        return { ...v, stock: newStock };
      })
    );
  };

  const updatePrice = (id: string, price: number | null) => {
    onChange(
      variants.map((v) => (v.id === id ? { ...v, price } : v))
    );
  };

  const removeVariant = (id: string) => {
    onChange(variants.filter((v) => v.id !== id));
  };

  const clearAll = () => {
    onChange([]);
  };

  const submitCustomInput = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customInput.trim();
    if (!clean) return;
    handleAddVariant({ label: clean });
    setCustomInput('');
  };

  const totalUnits = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-sm space-y-4">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-bold text-gray-900 block">
            Options & Déclinaisons <span className="text-[11px] font-normal text-gray-500">(Optionnel)</span>
          </label>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
            Ajoutez les couleurs, tailles ou pointures disponibles.
          </p>
        </div>

        {variants.length > 0 && (
          <span className="text-xs font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-xl border border-orange-100">
            {variants.length} option{variants.length > 1 ? 's' : ''} · {totalUnits} unités
          </span>
        )}
      </div>

      {/* ── SINGLE ACTION ROW (Ajouter une couleur, taille, pointure...) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* + Couleur */}
        <button
          type="button"
          onClick={() => setActiveDrawer(activeDrawer === 'color' ? null : 'color')}
          className={cn(
            'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border shadow-2xs',
            activeDrawer === 'color'
              ? 'bg-orange-500 text-white border-orange-500 shadow-orange-500/20'
              : 'bg-gray-50/80 hover:bg-orange-50/60 border-gray-200/70 hover:border-orange-200 text-gray-700'
          )}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>+ Couleur</span>
        </button>

        {/* + Taille (Vêtements) */}
        <button
          type="button"
          onClick={() => setActiveDrawer(activeDrawer === 'clothing_size' ? null : 'clothing_size')}
          className={cn(
            'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border shadow-2xs',
            activeDrawer === 'clothing_size'
              ? 'bg-orange-500 text-white border-orange-500 shadow-orange-500/20'
              : 'bg-gray-50/80 hover:bg-orange-50/60 border-gray-200/70 hover:border-orange-200 text-gray-700'
          )}
        >
          <Shirt className="w-3.5 h-3.5" />
          <span>+ Taille</span>
        </button>

        {/* + Pointure (Chaussures) */}
        <button
          type="button"
          onClick={() => setActiveDrawer(activeDrawer === 'shoe_size' ? null : 'shoe_size')}
          className={cn(
            'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border shadow-2xs',
            activeDrawer === 'shoe_size'
              ? 'bg-orange-500 text-white border-orange-500 shadow-orange-500/20'
              : 'bg-gray-50/80 hover:bg-orange-50/60 border-gray-200/70 hover:border-orange-200 text-gray-700'
          )}
        >
          <Footprints className="w-3.5 h-3.5" />
          <span>+ Pointure</span>
        </button>

        {/* + Autre (Capacité, etc.) */}
        <button
          type="button"
          onClick={() => setActiveDrawer(activeDrawer === 'custom' ? null : 'custom')}
          className={cn(
            'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border shadow-2xs',
            activeDrawer === 'custom'
              ? 'bg-orange-500 text-white border-orange-500 shadow-orange-500/20'
              : 'bg-gray-50/80 hover:bg-orange-50/60 border-gray-200/70 hover:border-orange-200 text-gray-700'
          )}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>+ Autre</span>
        </button>
      </div>

      {/* ── EXPANDING QUICK-SELECTOR TRAY ── */}
      <AnimatePresence>
        {activeDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3.5 rounded-2xl bg-orange-50/40 border border-orange-100 space-y-3">
              {/* Drawer: COULEURS */}
              {activeDrawer === 'color' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-gray-700">Choisissez une couleur :</span>
                    <button
                      type="button"
                      onClick={() => setActiveDrawer(null)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((c) => {
                      const isSelected = variants.some((v) => v.label.toLowerCase() === c.name.toLowerCase());
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => handleAddVariant({ label: c.name, color: c.name, color_code: c.code })}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs border active:scale-95',
                            isSelected
                              ? 'bg-orange-100 border-orange-300 text-orange-950 ring-2 ring-orange-400/20'
                              : 'bg-white border-gray-200 hover:border-orange-300 text-gray-800'
                          )}
                        >
                          <span
                            className={cn('w-3 h-3 rounded-full flex-shrink-0', c.border && 'border border-gray-300')}
                            style={{ backgroundColor: c.code }}
                          />
                          <span>{c.name}</span>
                          {isSelected && <Check className="w-3 h-3 text-orange-600 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Drawer: TAILLES VÊTEMENTS */}
              {activeDrawer === 'clothing_size' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-gray-700">Choisissez une taille :</span>
                    <button
                      type="button"
                      onClick={() => setActiveDrawer(null)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_CLOTHING_SIZES.map((size) => {
                      const isSelected = variants.some((v) => v.label.toLowerCase() === size.toLowerCase());
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => handleAddVariant({ label: size, size })}
                          className={cn(
                            'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shadow-2xs border active:scale-95',
                            isSelected
                              ? 'bg-orange-100 border-orange-300 text-orange-950 ring-2 ring-orange-400/20'
                              : 'bg-white border-gray-200 hover:border-orange-300 text-gray-800'
                          )}
                        >
                          {size}
                          {isSelected && <Check className="w-3 h-3 text-orange-600 inline ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Drawer: POINTURES CHAUSSURES */}
              {activeDrawer === 'shoe_size' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-gray-700">Choisissez une pointure :</span>
                    <button
                      type="button"
                      onClick={() => setActiveDrawer(null)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SHOE_SIZES.map((shoeSize) => {
                      const isSelected = variants.some((v) => v.label.toLowerCase() === shoeSize.toLowerCase());
                      return (
                        <button
                          key={shoeSize}
                          type="button"
                          onClick={() => handleAddVariant({ label: shoeSize, size: shoeSize })}
                          className={cn(
                            'px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-2xs border active:scale-95',
                            isSelected
                              ? 'bg-orange-100 border-orange-300 text-orange-950 ring-2 ring-orange-400/20'
                              : 'bg-white border-gray-200 hover:border-orange-300 text-gray-800'
                          )}
                        >
                          {shoeSize}
                          {isSelected && <Check className="w-3 h-3 text-orange-600 inline ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Drawer: AUTRE / PERSONNALISÉ */}
              {activeDrawer === 'custom' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-700">Suggestions rapides :</span>
                    <button
                      type="button"
                      onClick={() => setActiveDrawer(null)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_STORAGE_SIZES.map((storage) => (
                      <button
                        key={storage}
                        type="button"
                        onClick={() => handleAddVariant({ label: storage })}
                        className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:border-orange-300 text-xs font-bold text-gray-800 active:scale-95 transition-all shadow-2xs"
                      >
                        +{storage}
                      </button>
                    ))}
                  </div>

                  {/* Custom text input */}
                  <form onSubmit={submitCustomInput} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="ex: 128 Go, Coton, Pack de 3..."
                      className="flex-1 h-9 px-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!customInput.trim()}
                      className="px-4 h-9 rounded-xl bg-orange-500 text-white text-xs font-bold shadow-2xs hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Ajouter
                    </button>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LIST OF CONFIGURED VARIANTS (CLEAN, COMPACT CHIPS/CARDS) ── */}
      {variants.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Déclinaisons ajoutées ({variants.length})
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors"
            >
              Effacer tout
            </button>
          </div>

          <div className="space-y-2">
            {variants.map((variant) => (
              <div
                key={variant.id}
                className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-gray-50/80 border border-gray-100 hover:border-gray-200 transition-all gap-3"
              >
                {/* Variant Label with Color Dot if applicable */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {variant.color_code ? (
                    <span
                      className={cn(
                        'w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-2xs',
                        variant.color_code.toLowerCase() === '#ffffff' && 'border border-gray-300'
                      )}
                      style={{ backgroundColor: variant.color_code }}
                    />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                  )}
                  <span className="text-xs font-bold text-gray-900 truncate">
                    {variant.label}
                  </span>
                </div>

                {/* Stock Stepper [ - ] 1 [ + ] */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] font-semibold text-gray-400 hidden sm:inline">Stock:</span>
                  <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => updateStock(variant.id, -1)}
                      disabled={variant.stock <= 1}
                      className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Diminuer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center text-xs font-black text-gray-900">
                      {variant.stock}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateStock(variant.id, 1)}
                      className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg"
                      title="Augmenter"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Optional Price Override */}
                <div className="w-24 hidden sm:block flex-shrink-0">
                  <div className="relative">
                    <input
                      type="number"
                      min="300"
                      value={variant.price ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updatePrice(variant.id, val === '' ? null : Number(val));
                      }}
                      placeholder="Prix base"
                      className="h-7 w-full rounded-lg border border-gray-200 bg-white px-2 pr-5 text-[11px] font-semibold text-gray-900 placeholder:text-[10px] placeholder:text-gray-400 focus:border-orange-500 focus:outline-none"
                    />
                    <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400">F</span>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => removeVariant(variant.id)}
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-95 flex-shrink-0"
                  title="Supprimer cette option"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingVariantsSection;
