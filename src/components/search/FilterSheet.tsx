import React from 'react';
import { createPortal } from 'react-dom';
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
    onClose();
  };

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex flex-col justify-end">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="relative z-10 w-full bg-gray-50 rounded-t-[32px] flex flex-col shadow-2xl overflow-hidden pb-[calc(16px+env(safe-area-inset-bottom,0px))]"
            style={{ maxHeight: '85vh' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
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
                    className="p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 active:scale-[0.97] transition-all"
                    aria-label="Fermer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable filters */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Catégories */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
                  Catégorie
                </h3>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <Chip
                      key={cat.id}
                      selected={local.category === cat.id}
                      onClick={() =>
                        setLocal((p) => ({
                          ...p,
                          category: p.category === cat.id ? '' : cat.id,
                        }))
                      }
                      label={cat.label}
                    />
                  ))}
                </div>
              </section>

              {/* État */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
                  État de l'article
                </h3>
                <div className="flex flex-wrap gap-2">
                  {CONDITIONS.map((cond) => (
                    <Chip
                      key={cond.id}
                      selected={local.condition === cond.id}
                      onClick={() =>
                        setLocal((p) => ({
                          ...p,
                          condition: p.condition === cond.id ? '' : cond.id,
                        }))
                      }
                      label={cond.label}
                    />
                  ))}
                </div>
              </section>

              {/* Quartier */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
                  Quartier (Daloa)
                </h3>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                  {DISTRICTS.map((d) => (
                    <Chip
                      key={d}
                      selected={local.district === d}
                      onClick={() =>
                        setLocal((p) => ({
                          ...p,
                          district: p.district === d ? '' : d,
                        }))
                      }
                      label={d}
                    />
                  ))}
                </div>
              </section>

              {/* Prix */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
                  Fourchette de prix (FCFA)
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
                  <span className="text-gray-300 font-bold">—</span>
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
            <div className="flex-shrink-0 p-4 pb-6 bg-white border-t border-gray-100">
              <button
                onClick={handleApply}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-extrabold active:scale-[0.97] transition-all shadow-lg shadow-orange-200/60"
              >
                Appliquer les filtres
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default FilterSheet;
