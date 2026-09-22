import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  CATEGORY_CATALOG,
  getCategoryPath,
  type CategoryConfig,
} from '../../lib/categoryCatalog';
import type { FacetBucket } from '../../hooks/useCategoryFacets';
import PriceRangeSlider from './PriceRangeSlider';

interface CategoryTreeProps {
  current: CategoryConfig;
  countByCategory: Record<string, number>;
  conditions: FacetBucket[];
  districts: FacetBucket[];
  selection: { condition: string; district: string; priceMin: string; priceMax: string };
  priceBounds: { min: number; max: number };
  activeFilterCount: number;
  onToggleCondition: (id: string) => void;
  onToggleDistrict: (id: string) => void;
  onPriceCommit: (min: string, max: string) => void;
  onReset: () => void;
}

const VISIBLE_DISTRICTS = 8;

const FacetRow: React.FC<{
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}> = ({ label, count, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={cn(
      'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left transition-colors',
      selected ? 'bg-[var(--color-primary-50)]' : 'hover:bg-gray-50',
    )}
  >
    <span
      className={cn(
        'truncate text-[13px]',
        selected ? 'font-extrabold text-[var(--color-primary-700)]' : 'font-semibold text-gray-600',
      )}
    >
      {label}
    </span>
    <span
      className={cn(
        'shrink-0 text-[11px] font-bold tabular-nums',
        selected ? 'text-[var(--color-primary-700)]' : 'text-gray-400',
      )}
    >
      {count}
    </span>
  </button>
);

/**
 * Arborescence de navigation catégorie (desktop).
 *
 * Niveau 1 = les catégories du catalogue avec leur volume d'annonces actives.
 * Niveau 2 = les facettes réellement disponibles dans la catégorie ouverte
 * (état, quartier), chacune avec son compteur.
 */
const CategoryTree: React.FC<CategoryTreeProps> = ({
  current,
  countByCategory,
  conditions,
  districts,
  selection,
  priceBounds,
  activeFilterCount,
  onToggleCondition,
  onToggleDistrict,
  onPriceCommit,
  onReset,
}) => {
  const [showAllDistricts, setShowAllDistricts] = React.useState(false);
  const visibleDistricts = showAllDistricts ? districts : districts.slice(0, VISIBLE_DISTRICTS);

  return (
    <aside className="sticky top-4 space-y-4">
      <nav
        aria-label="Catégories"
        className="bg-white rounded-3xl border border-gray-100 p-4 shadow-lg shadow-gray-200/50"
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
            Catégories
          </h2>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 text-[11px] font-extrabold text-[var(--color-primary-700)] hover:underline"
            >
              <RotateCcw className="h-3 w-3" />
              Réinitialiser
            </button>
          )}
        </div>

        <ul className="space-y-0.5">
          {CATEGORY_CATALOG.map((category) => {
            const isCurrent = category.id === current.id;
            const count = countByCategory[category.id] ?? 0;

            return (
              <li key={category.id}>
                <Link
                  to={getCategoryPath(category)}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={cn(
                    'group flex items-center justify-between gap-2 px-2.5 py-2 rounded-2xl transition-colors',
                    isCurrent
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-200/60'
                      : count === 0
                        ? 'text-gray-400 hover:bg-gray-50'
                        : 'text-gray-700 hover:bg-gray-50',
                  )}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <ChevronRight
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 transition-transform',
                        isCurrent ? 'rotate-90' : 'opacity-40 group-hover:opacity-70',
                      )}
                    />
                    <span className="truncate text-[13.5px] font-extrabold">{category.short}</span>
                  </span>
                  <span
                    className={cn(
                      'shrink-0 text-[11px] font-bold tabular-nums',
                      isCurrent ? 'text-white/80' : 'text-gray-400',
                    )}
                  >
                    {count}
                  </span>
                </Link>

                {isCurrent && (conditions.length > 0 || districts.length > 0) && (
                  <div className="mt-1.5 mb-1 ml-3.5 pl-3 border-l-2 border-orange-100 space-y-3">
                    {conditions.length > 0 && (
                      <div>
                        <h3 className="px-2.5 mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                          État
                        </h3>
                        {conditions.map((bucket) => (
                          <FacetRow
                            key={bucket.id}
                            label={bucket.label}
                            count={bucket.count}
                            selected={selection.condition === bucket.id}
                            onClick={() => onToggleCondition(bucket.id)}
                          />
                        ))}
                      </div>
                    )}

                    {districts.length > 0 && (
                      <div>
                        <h3 className="px-2.5 mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                          Quartier
                        </h3>
                        {visibleDistricts.map((bucket) => (
                          <FacetRow
                            key={bucket.id}
                            label={bucket.label}
                            count={bucket.count}
                            selected={selection.district === bucket.id}
                            onClick={() => onToggleDistrict(bucket.id)}
                          />
                        ))}
                        {districts.length > VISIBLE_DISTRICTS && (
                          <button
                            type="button"
                            onClick={() => setShowAllDistricts((prev) => !prev)}
                            className="mt-0.5 px-2.5 text-[11px] font-extrabold text-[var(--color-primary-700)] hover:underline"
                          >
                            {showAllDistricts
                              ? 'Voir moins'
                              : `Voir les ${districts.length} quartiers`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="bg-white rounded-3xl border border-gray-100 p-4 shadow-lg shadow-gray-200/50">
        <h2 className="mb-3 px-1 text-[13px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
          Prix (FCFA)
        </h2>
        <PriceRangeSlider
          min={priceBounds.min}
          max={priceBounds.max}
          valueMin={selection.priceMin}
          valueMax={selection.priceMax}
          onCommit={onPriceCommit}
        />
      </section>
    </aside>
  );
};

export default CategoryTree;
