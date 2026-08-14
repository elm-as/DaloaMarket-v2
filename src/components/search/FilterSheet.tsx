import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CONDITIONS, CATEGORIES, DISTRICTS } from '../../lib/utils';

export interface FilterValues {
  category: string;
  condition: string;
  district: string;
  priceMin: string;
  priceMax: string;
}

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterValues;
  onApply: (filters: FilterValues) => void;
}

const Chip: React.FC<{
  selected: boolean;
  onClick: () => void;
  label: string;
}> = ({ selected, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'px-3.5 py-2 rounded-2xl text-xs font-bold transition-all active:scale-[0.97] border',
      selected
        ? 'text-white border-transparent shadow-md'
        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
    )}
    style={selected ? { background: 'var(--gradient-primary)' } : undefined}
  >
    {label}
  </button>
);

const FilterSheet: React.FC<FilterSheetProps> = ({
  isOpen,
  onClose,
  filters,
  onApply,
}) => {
  const [local, setLocal] = React.useState<FilterValues>(filters);

  React.useEffect(() => {
    setLocal(filters);
  }, [filters, isOpen]);

  const update = (key: keyof FilterValues, value: string) => {
    setLocal((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'category' && prev.category === value) {
        next.category = '';
      } else if (key === 'condition' && prev.condition === value) {
        next.condition = '';
      } else if (key === 'district' && prev.district === value) {
        next.district = '';
      }
      return next;
    });
  };

  const handleReset = () => {
    const empty: FilterValues = {
      category: '',
      condition: '',
      district: '',
      priceMin: '',
      priceMax: '',
    };
    setLocal(empty);
    onApply(empty);
  };

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[60] bg-gray-50 rounded-t-[32px] flex flex-col shadow-2xl overflow-hidden"
            style={{ maxHeight: '85vh', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Handle + Header (sticky top) */}
            <div className="flex-shrink-0 pt-3 pb-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-t-[32px]">
              <div className="w-10 h-1 bg-white/50 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between px-5 pb-2">
                <h2 className="text-xl font-extrabold tracking-tight text-white">Filtres</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="text-sm font-bold text-orange-100 hover:text-white active:scale-[0.97] transition-all"
                  >
                    Réinitialiser
                  </button>
                  <button
                    onClick={onClose}
                    className="w-9 h-9 rounded-2xl bg-white/15 text-white flex items-center justify-center hover:bg-white/25 active:scale-[0.97] transition-all"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 p-4 space-y-3 bg-gray-50">
              {/* Category */}
              <section className="bg-white rounded-3xl p-4 border border-gray-100 shadow-lg shadow-gray-200/40">
                <h3 className="text-sm font-extrabold text-gray-900 mb-3">
                  Catégorie
                </h3>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <Chip
                      key={cat.id}
                      selected={local.category === cat.id}
                      onClick={() => update('category', cat.id)}
                      label={cat.label}
                    />
                  ))}
                </div>
              </section>

              {/* Condition */}
              <section className="bg-white rounded-3xl p-4 border border-gray-100 shadow-lg shadow-gray-200/40">
                <h3 className="text-sm font-extrabold text-gray-900 mb-3">
                  État
                </h3>
                <div className="flex flex-wrap gap-2">
                  {CONDITIONS.map((cond) => (
                    <Chip
                      key={cond.id}
                      selected={local.condition === cond.id}
                      onClick={() => update('condition', cond.id)}
                      label={cond.label}
                    />
                  ))}
                </div>
              </section>

              {/* District */}
              <section className="bg-white rounded-3xl p-4 border border-gray-100 shadow-lg shadow-gray-200/40">
                <h3 className="text-sm font-extrabold text-gray-900 mb-3">
                  Quartier
                </h3>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {DISTRICTS.slice(0, 24).map((d) => (
                    <Chip
                      key={d}
                      selected={local.district === d}
                      onClick={() => update('district', d)}
                      label={d}
                    />
                  ))}
                </div>
              </section>

              {/* Price range */}
              <section className="bg-white rounded-3xl p-4 border border-gray-100 shadow-lg shadow-gray-200/40">
                <h3 className="text-sm font-extrabold text-gray-900 mb-3">
                  Prix (FCFA)
                </h3>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    placeholder="Min"
                    value={local.priceMin}
                    onChange={(e) =>
                      setLocal((p) => ({ ...p, priceMin: e.target.value }))
                    }
                    className="flex-1 min-w-0 h-12 px-4 rounded-2xl border-0 bg-gray-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                  <span className="text-gray-400 font-medium">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={local.priceMax}
                    onChange={(e) =>
                      setLocal((p) => ({ ...p, priceMax: e.target.value }))
                    }
                    className="flex-1 min-w-0 h-12 px-4 rounded-2xl border-0 bg-gray-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
              </section>
            </div>

            {/* Apply button (sticky bottom) */}
            <div className="flex-shrink-0 p-4 pb-8 bg-white border-t border-gray-100">
              <button
                onClick={handleApply}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-extrabold active:scale-[0.97] transition-all shadow-lg shadow-orange-200/60"
              >
                Appliquer les filtres
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FilterSheet;
