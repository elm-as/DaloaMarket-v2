import React from 'react';
import { cn } from '../../lib/utils';
import { CATEGORIES, CONDITIONS, DISTRICTS } from '../../lib/utils';
import type { FilterValues } from './FilterSheet';

interface FilterPanelProps {
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
      'px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] border',
      selected
        ? 'bg-primary text-white border-primary shadow-sm'
        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
    )}
  >
    {label}
  </button>
);

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onApply }) => {
  const [local, setLocal] = React.useState<FilterValues>(filters);

  React.useEffect(() => {
    setLocal(filters);
  }, [filters]);

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
  };

  return (
    <aside className="bg-white rounded-2xl border border-gray-100 p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Filtres</h2>
        <button
          onClick={handleReset}
          className="text-sm font-medium text-gray-500 hover:text-primary active:scale-[0.97] transition-all"
        >
          Reinitialiser
        </button>
      </div>

      {/* Category */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2.5">
          Categorie
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
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2.5">Etat</h3>
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
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2.5">
          Quartier
        </h3>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {DISTRICTS.map((d) => (
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
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2.5">
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
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <span className="text-gray-400 font-medium">-</span>
          <input
            type="number"
            placeholder="Max"
            value={local.priceMax}
            onChange={(e) =>
              setLocal((p) => ({ ...p, priceMax: e.target.value }))
            }
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </section>

      {/* Apply button */}
      <button
        onClick={handleApply}
        className="w-full py-3 rounded-xl text-white font-bold active:scale-[0.97] transition-all shadow-lg"
        style={{
          background: 'var(--gradient-primary)',
          boxShadow: 'var(--elevation-primary)',
        }}
      >
        Appliquer les filtres
      </button>
    </aside>
  );
};

export default FilterPanel;
