import React from 'react';
import { Link } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  CATEGORY_CATALOG,
  getCategoryPath,
  type CategoryConfig,
} from '../../lib/categoryCatalog';
import type { FacetBucket } from '../../hooks/useCategoryFacets';
import PriceRangeSlider from './PriceRangeSlider';

interface CategoryChipsBarProps {
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

const VISIBLE_DISTRICTS = 12;

const FacetChip: React.FC<{
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
      'shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-2xl border text-[12.5px] font-extrabold transition-all active:scale-[0.97]',
      selected
        ? 'bg-gray-900 text-white border-transparent shadow-md'
        : 'bg-white text-gray-600 border-gray-200',
    )}
  >
    <span className="truncate max-w-[130px]">{label}</span>
    <span
      className={cn('text-[10.5px] font-bold tabular-nums', selected ? 'text-white/70' : 'text-gray-400')}
    >
      {count}
    </span>
  </button>
);

/**
 * Barre de navigation et de facettes (mobile).
 *
 * Trois bandeaux défilants : les catégories soeurs, puis les facettes de la
 * catégorie ouverte. Le filtre de prix se déplie à la demande pour ne pas
 * manger la hauteur d'écran utile aux résultats.
 */
const CategoryChipsBar: React.FC<CategoryChipsBarProps> = ({
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
  const [priceOpen, setPriceOpen] = React.useState(false);
  const hasPriceFilter = Boolean(selection.priceMin || selection.priceMax);

  return (
    <div className="lg:hidden space-y-2.5">
      {/* Catégories soeurs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 -mx-4 pb-0.5">
        {CATEGORY_CATALOG.map((category) => {
          const isCurrent = category.id === current.id;
          return (
            <Link
              key={category.id}
              to={getCategoryPath(category)}
              aria-current={isCurrent ? 'page' : undefined}
              className={cn(
                'shrink-0 flex items-center gap-1.5 h-9 px-3.5 rounded-2xl text-[12.5px] font-extrabold transition-all active:scale-[0.97]',
                isCurrent
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-200/60'
                  : 'bg-white text-gray-600 border border-gray-200',
              )}
            >
              <span>{category.short}</span>
              <span
                className={cn(
                  'text-[10.5px] font-bold tabular-nums',
                  isCurrent ? 'text-white/75' : 'text-gray-400',
                )}
              >
                {countByCategory[category.id] ?? 0}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Facettes de la catégorie courante */}
      {(conditions.length > 0 || districts.length > 0) && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 -mx-4 pb-0.5">
          <button
            type="button"
            onClick={() => setPriceOpen((prev) => !prev)}
            aria-expanded={priceOpen}
            className={cn(
              'shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-2xl border text-[12.5px] font-extrabold transition-all active:scale-[0.97]',
              hasPriceFilter || priceOpen
                ? 'bg-gray-900 text-white border-transparent shadow-md'
                : 'bg-white text-gray-600 border-gray-200',
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Prix
          </button>

          {conditions.map((bucket) => (
            <FacetChip
              key={`c-${bucket.id}`}
              label={bucket.label}
              count={bucket.count}
              selected={selection.condition === bucket.id}
              onClick={() => onToggleCondition(bucket.id)}
            />
          ))}

          {districts.slice(0, VISIBLE_DISTRICTS).map((bucket) => (
            <FacetChip
              key={`d-${bucket.id}`}
              label={bucket.label}
              count={bucket.count}
              selected={selection.district === bucket.id}
              onClick={() => onToggleDistrict(bucket.id)}
            />
          ))}

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="shrink-0 flex items-center gap-1 h-9 px-3 rounded-2xl border border-gray-200 bg-white text-[12.5px] font-extrabold text-gray-500 active:scale-[0.97]"
            >
              <X className="h-3.5 w-3.5" />
              Effacer
            </button>
          )}
        </div>
      )}

      {/* Filtre de prix déplié */}
      {priceOpen && (
        <div className="mx-4 rounded-3xl border border-gray-100 bg-white p-4 shadow-lg shadow-gray-200/50">
          <PriceRangeSlider
            min={priceBounds.min}
            max={priceBounds.max}
            valueMin={selection.priceMin}
            valueMax={selection.priceMax}
            onCommit={onPriceCommit}
          />
        </div>
      )}
    </div>
  );
};

export default CategoryChipsBar;
