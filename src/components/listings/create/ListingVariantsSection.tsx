import React, { useState } from 'react';
import { Plus, Palette, Ruler, Trash2, Check, Sparkles, X, Edit2, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatPrice } from '../../../lib/utils';
import { Button } from '../../ui/Button';
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
  { name: 'Violet', code: '#8B5CF6', border: false },
  { name: 'Marron', code: '#78350F', border: false },
  { name: 'Gris', code: '#6B7280', border: false },
  { name: 'Doré', code: '#D97706', border: false },
  { name: 'Argenté', code: '#94A3B8', border: false },
];

const PRESET_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '38', '40', '42', '44', 'Unique'];

const makeVariantId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `variant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
};

export const ListingVariantsSection: React.FC<ListingVariantsSectionProps> = ({ variants, onChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'sizes' | 'colors'>('all');

  const addVariant = (presetColor?: { name: string; code: string }, presetSize?: string) => {
    const colorName = presetColor?.name || '';
    const colorCode = presetColor?.code || '';
    const sizeName = presetSize || '';

    let label = '';
    if (colorName && sizeName) {
      label = `${colorName} · ${sizeName}`;
    } else if (colorName) {
      label = colorName;
    } else if (sizeName) {
      label = sizeName;
    }

    onChange([
      ...variants,
      {
        id: makeVariantId(),
        label,
        color: colorName || null,
        color_code: colorCode || null,
        size: sizeName || null,
        price: null,
        stock: 1,
        active: true,
      },
    ]);
  };

  const updateVariant = (id: string, patch: Partial<ListingVariant>) => {
    onChange(
      variants.map((variant) => {
        if (variant.id !== id) return variant;

        const updated = { ...variant, ...patch };

        if (patch.color !== undefined || patch.size !== undefined) {
          const c = (patch.color !== undefined ? patch.color : variant.color) || '';
          const s = (patch.size !== undefined ? patch.size : variant.size) || '';
          if (c && s) {
            updated.label = `${c} · ${s}`;
          } else if (c) {
            updated.label = c;
          } else if (s) {
            updated.label = s;
          }
        }

        return updated;
      })
    );
  };

  const removeVariant = (id: string) => {
    onChange(variants.filter((variant) => variant.id !== id));
  };

  const clearAllVariants = () => {
    onChange([]);
  };

  const totalStock = variants.reduce((total, variant) => total + Math.max(0, Number(variant.stock) || 0), 0);

  return (
    <div className="pt-1">
      {/* ── COMPACT TRIGGER CARD ON THE CREATE FORM ── */}
      {variants.length === 0 ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-between p-4 rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 hover:bg-orange-50/70 text-orange-700 transition-all text-left group active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100/80 flex items-center justify-center text-orange-600 group-hover:scale-105 transition-transform flex-shrink-0">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-gray-900 block">
                Ajouter des Couleurs ou Tailles
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                Optionnel · Si votre produit existe en plusieurs options
              </span>
            </div>
          </div>
          <span className="text-xs font-extrabold text-orange-600 bg-white px-3 py-1.5 rounded-xl shadow-2xs border border-orange-200/60 flex items-center gap-1">
            <Plus size={14} /> Configurer
          </span>
        </button>
      ) : (
        <div className="p-4 rounded-2xl bg-orange-50/40 border border-orange-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0">
                {variants.length}
              </div>
              <div>
                <span className="text-xs font-extrabold text-gray-900 block">
                  {variants.length} déclinaison{variants.length > 1 ? 's' : ''} active{variants.length > 1 ? 's' : ''}
                </span>
                <span className="text-[11px] text-orange-700 font-bold">
                  {totalStock} unités au total
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white border border-orange-200 text-xs font-extrabold text-orange-600 shadow-2xs hover:bg-orange-50 active:scale-95 transition-all flex items-center gap-1"
            >
              <Edit2 size={12} /> Modifier
            </button>
          </div>

          {/* Chips preview */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {variants.slice(0, 6).map((variant) => (
              <span
                key={variant.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-orange-100 text-[11px] font-bold text-gray-800 shadow-2xs"
              >
                {variant.color_code && (
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full flex-shrink-0",
                      variant.color_code.toLowerCase() === '#ffffff' && "border border-gray-300"
                    )}
                    style={{ backgroundColor: variant.color_code }}
                  />
                )}
                <span>{variant.label || variant.size || variant.color || 'Option'}</span>
                <span className="text-gray-400 font-semibold">({variant.stock})</span>
              </span>
            ))}
            {variants.length > 6 && (
              <span className="inline-flex items-center px-2 py-1 rounded-xl bg-orange-100 text-[10px] font-extrabold text-orange-700">
                +{variants.length - 6} autres
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── FULL CONFIGURATION MODAL ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-10 my-auto flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-orange-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-sm">
                    <Palette className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900">
                      Gérer les Couleurs & Tailles
                    </h3>
                    <p className="text-[11px] font-medium text-gray-500">
                      Ajoutez les déclinaisons disponibles pour vos clients
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center active:scale-95 transition-all"
                  aria-label="Fermer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
                {/* ── QUICK PRESET BUTTONS ── */}
                <div className="bg-orange-50/40 rounded-2xl p-3.5 border border-orange-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-orange-800 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={12} className="text-orange-500" />
                      Ajout rapide en 1 clic
                    </span>
                    <div className="flex gap-1 bg-white/80 p-0.5 rounded-xl border border-orange-100 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setActiveTab('all')}
                        className={cn("px-2 py-0.5 rounded-lg transition-all", activeTab === 'all' ? "bg-orange-500 text-white" : "text-gray-600")}
                      >
                        Tous
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('colors')}
                        className={cn("px-2 py-0.5 rounded-lg transition-all", activeTab === 'colors' ? "bg-orange-500 text-white" : "text-gray-600")}
                      >
                        Couleurs
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('sizes')}
                        className={cn("px-2 py-0.5 rounded-lg transition-all", activeTab === 'sizes' ? "bg-orange-500 text-white" : "text-gray-600")}
                      >
                        Tailles
                      </button>
                    </div>
                  </div>

                  {/* Colors */}
                  {(activeTab === 'all' || activeTab === 'colors') && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 mb-1 block">Couleurs :</span>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => addVariant(c)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-gray-200 hover:border-orange-400 text-xs font-semibold text-gray-800 active:scale-95 transition-all shadow-2xs"
                          >
                            <span
                              className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", c.border && "border border-gray-300")}
                              style={{ backgroundColor: c.code }}
                            />
                            <span>+{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sizes */}
                  {(activeTab === 'all' || activeTab === 'sizes') && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 mb-1 block">Tailles :</span>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_SIZES.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => addVariant(undefined, size)}
                            className="px-2.5 py-1 rounded-xl bg-white border border-gray-200 hover:border-orange-400 text-xs font-bold text-gray-700 active:scale-95 transition-all shadow-2xs"
                          >
                            +{size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── VARIANTS TABLE ── */}
                {variants.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-gray-800">
                        Liste des déclinaisons ({variants.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => addVariant()}
                        className="inline-flex items-center gap-1 text-xs font-extrabold text-orange-600 hover:underline"
                      >
                        <Plus size={14} /> Ajouter une ligne personnalisée
                      </button>
                    </div>

                    <div className="hidden sm:grid sm:grid-cols-[140px_1fr_100px_80px_36px] gap-2 px-1 text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
                      <span>Couleur</span>
                      <span>Taille / Libellé</span>
                      <span>Prix (FCFA)</span>
                      <span>Stock</span>
                      <span />
                    </div>

                    <div className="space-y-2.5">
                      {variants.map((variant) => (
                        <div
                          key={variant.id}
                          className="p-3 sm:p-0 rounded-2xl sm:rounded-none bg-gray-50/70 sm:bg-transparent border sm:border-0 border-gray-100 grid grid-cols-1 sm:grid-cols-[140px_1fr_100px_80px_36px] gap-2 items-center"
                        >
                          {/* Color */}
                          <div className="flex items-center gap-1.5">
                            <div className="relative flex-shrink-0">
                              <input
                                type="color"
                                value={variant.color_code || '#111827'}
                                onChange={(e) => {
                                  updateVariant(variant.id, {
                                    color_code: e.target.value,
                                    color: variant.color || 'Personnalisé',
                                  });
                                }}
                                className="w-8 h-8 rounded-xl cursor-pointer border border-gray-200 p-0.5 bg-white"
                                title="Choisir une teinte"
                              />
                            </div>
                            <input
                              type="text"
                              value={variant.color || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const matchedPreset = PRESET_COLORS.find(p => p.name.toLowerCase() === val.trim().toLowerCase());
                                updateVariant(variant.id, {
                                  color: val,
                                  color_code: matchedPreset ? matchedPreset.code : variant.color_code,
                                });
                              }}
                              placeholder="Couleur (ex: Rouge)"
                              className="h-10 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                            />
                          </div>

                          {/* Size / Label */}
                          <div>
                            <input
                              type="text"
                              value={variant.size || variant.label || ''}
                              onChange={(e) => updateVariant(variant.id, { size: e.target.value, label: e.target.value })}
                              placeholder="Taille (ex: M, 42)"
                              className="h-10 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                            />
                          </div>

                          {/* Price */}
                          <div className="relative">
                            <input
                              type="number"
                              min="300"
                              value={variant.price ?? ''}
                              onChange={(event) => {
                                const value = event.target.value;
                                updateVariant(variant.id, { price: value === '' ? null : Number(value) });
                              }}
                              placeholder="Prix base"
                              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-2.5 pr-8 text-xs font-semibold text-gray-900 placeholder:text-[10px] placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                            />
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400">F</span>
                          </div>

                          {/* Stock */}
                          <div className="flex items-center gap-1">
                            <span className="sm:hidden text-xs font-bold text-gray-500">Stock:</span>
                            <input
                              type="number"
                              min="1"
                              value={variant.stock}
                              onChange={(event) => updateVariant(variant.id, { stock: Math.max(0, Number(event.target.value) || 0) })}
                              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-bold text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                            />
                          </div>

                          {/* Delete */}
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeVariant(variant.id)}
                              className="h-10 w-9 inline-flex items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 active:scale-95"
                              aria-label="Supprimer la variante"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center border border-dashed border-gray-200 rounded-2xl p-4">
                    <p className="text-xs font-extrabold text-gray-800">
                      Aucune option ajoutée pour l'instant
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Cliquez sur les pastilles de couleurs ou les tailles ci-dessus pour commencer.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3">
                {variants.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearAllVariants}
                    className="text-xs font-bold text-red-500 hover:text-red-700"
                  >
                    Effacer tout
                  </button>
                ) : <div />}

                <Button
                  type="button"
                  color="primary"
                  size="md"
                  className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-extrabold text-xs shadow-md shadow-orange-500/20 active:scale-95 px-6"
                  onClick={() => setIsModalOpen(false)}
                >
                  Valider ({variants.length} option{variants.length > 1 ? 's' : ''})
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ListingVariantsSection;
