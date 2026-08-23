import React from 'react';
import { Sparkles, ThumbsUp, CheckCircle, Clock4, Shirt, Monitor, Home, Car, Dumbbell, BookOpen, UtensilsCrossed } from 'lucide-react';
import type { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';
import type { ListingFormValues } from '../../../pages/ListingCreatePage';
import { CATEGORIES, CONDITIONS, cn } from '../../../lib/utils';

interface ListingDetailsSectionProps {
  register: UseFormRegister<ListingFormValues>;
  errors: FieldErrors<ListingFormValues>;
  watchCategory: string;
  watchCondition: string;
  setValue: UseFormSetValue<ListingFormValues>;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  fashion: <Shirt className="w-4 h-4" />,
  electronics: <Monitor className="w-4 h-4" />,
  home: <Home className="w-4 h-4" />,
  vehicles: <Car className="w-4 h-4" />,
  sports: <Dumbbell className="w-4 h-4" />,
  books: <BookOpen className="w-4 h-4" />,
  food: <UtensilsCrossed className="w-4 h-4" />,
};

const CONDITION_ICONS: Record<string, React.ReactNode> = {
  new: <Sparkles className="w-3.5 h-3.5" />,
  like_new: <ThumbsUp className="w-3.5 h-3.5" />,
  good: <CheckCircle className="w-3.5 h-3.5" />,
  used: <Clock4 className="w-3.5 h-3.5" />,
};

export const ListingDetailsSection: React.FC<ListingDetailsSectionProps> = ({
  register,
  errors,
  watchCategory,
  watchCondition,
  setValue,
}) => {
  return (
    <div className="space-y-4 pt-1">
      {/* ── CATEGORY SELECTOR (COMPACT CHIPS) ── */}
      <div>
        <label className="block text-xs font-bold text-gray-800 mb-2">
          Catégorie de l'article <span className="text-red-500">*</span>
        </label>
        <input type="hidden" {...register('category', { required: 'Choisissez une catégorie' })} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CATEGORIES.map((cat) => {
            const isSelected = watchCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setValue('category', cat.id, { shouldValidate: true })}
                className={cn(
                  'flex items-center gap-2 p-2.5 rounded-2xl border text-left transition-all cursor-pointer active:scale-95 shadow-2xs',
                  isSelected
                    ? 'border-orange-500 bg-orange-50/80 text-orange-950 font-black shadow-xs ring-2 ring-orange-500/20'
                    : 'border-gray-200/80 bg-gray-50/60 text-gray-700 hover:border-gray-300 hover:bg-white'
                )}
              >
                <div className={cn('p-1.5 rounded-xl transition-colors', isSelected ? 'bg-orange-500 text-white' : 'bg-white text-gray-500')}>
                  {CATEGORY_ICONS[cat.id]}
                </div>
                <span className="text-xs truncate">{cat.label}</span>
              </button>
            );
          })}
        </div>
        {errors.category && <p className="text-xs text-red-500 mt-1.5 ml-1 font-semibold">{errors.category.message}</p>}
      </div>

      {/* ── CONDITION SELECTOR (4 COMPACT PILLS) ── */}
      <div>
        <label className="block text-xs font-bold text-gray-800 mb-2">
          État de l'article <span className="text-red-500">*</span>
        </label>
        <input type="hidden" {...register('condition', { required: "Choisissez l'état de l'article" })} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CONDITIONS.map((cond) => {
            const isSelected = watchCondition === cond.id;
            return (
              <button
                key={cond.id}
                type="button"
                onClick={() => setValue('condition', cond.id, { shouldValidate: true })}
                className={cn(
                  'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl border text-center transition-all cursor-pointer active:scale-95 shadow-2xs',
                  isSelected
                    ? 'border-orange-500 bg-orange-500 text-white font-black shadow-xs'
                    : 'border-gray-200/80 bg-gray-50/60 text-gray-700 hover:border-gray-300 hover:bg-white font-bold'
                )}
              >
                <div className={isSelected ? 'text-white' : 'text-orange-500'}>
                  {CONDITION_ICONS[cond.id]}
                </div>
                <span className="text-xs truncate">{cond.label}</span>
              </button>
            );
          })}
        </div>
        {errors.condition && <p className="text-xs text-red-500 mt-1.5 ml-1 font-semibold">{errors.condition.message}</p>}
      </div>
    </div>
  );
};

export default ListingDetailsSection;
