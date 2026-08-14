import React from 'react';
import { Tag, Sparkles, ThumbsUp, CheckCircle, Clock4, Shirt, Monitor, Home, Car, Dumbbell, BookOpen, UtensilsCrossed } from 'lucide-react';
import type { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Card } from '../../ui/Card';
import type { ListingFormValues } from '../../../pages/ListingCreatePage';

import {
  CATEGORIES,
  CONDITIONS,
  cn,
} from '../../../lib/utils';

interface ListingDetailsSectionProps {
  register: UseFormRegister<ListingFormValues>;
  errors: FieldErrors<ListingFormValues>;
  watchCategory: string;
  watchCondition: string;
  setValue: UseFormSetValue<ListingFormValues>;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  fashion: <Shirt className="w-5 h-5" />,
  electronics: <Monitor className="w-5 h-5" />,
  home: <Home className="w-5 h-5" />,
  vehicles: <Car className="w-5 h-5" />,
  sports: <Dumbbell className="w-5 h-5" />,
  books: <BookOpen className="w-5 h-5" />,
  food: <UtensilsCrossed className="w-5 h-5" />,
};

const CONDITION_ICONS: Record<string, React.ReactNode> = {
  new: <Sparkles className="w-5 h-5" />,
  like_new: <ThumbsUp className="w-5 h-5" />,
  good: <CheckCircle className="w-5 h-5" />,
  used: <Clock4 className="w-5 h-5" />,
};

const CONDITION_DESCRIPTIONS: Record<string, string> = {
  new: "Jamais utilisé, neuf sous emballage.",
  like_new: "Traces d'utilisation presque invisibles, comme neuf.",
  good: "Fonctionne parfaitement, légères traces d'usure.",
  used: "Traces d'usure visibles mais totalement fonctionnel.",
};

export const ListingDetailsSection: React.FC<ListingDetailsSectionProps> = ({
  register,
  errors,
  watchCategory,
  watchCondition,
  setValue,
}) => {
  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center gap-2.5 px-1">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-orange-50 text-orange-600">
          <Tag className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-gray-900">Catégorie & État</h2>
          <p className="text-[11px] font-medium text-gray-500">Précisez le type et l'état de votre article</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-lg shadow-gray-200/50 space-y-5">
        {/* CATEGORY GRID */}
        <div>
          <label className="block text-xs font-bold text-gray-800 mb-2.5 pl-1">
            Catégorie <span className="text-red-500">*</span>
          </label>
          <input type="hidden" {...register('category', { required: 'Choisissez une catégorie' })} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {CATEGORIES.map((cat) => {
              const isSelected = watchCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setValue('category', cat.id, { shouldValidate: true })}
                  className={cn(
                    "flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer active:scale-95",
                    isSelected
                      ? "border-orange-500 bg-orange-50/50 text-orange-600 font-extrabold shadow-sm ring-2 ring-orange-500/20"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50/50"
                  )}
                >
                  <div className={cn("mb-2 transition-transform", isSelected ? "scale-110 text-orange-600" : "text-gray-500")}>
                    {CATEGORY_ICONS[cat.id]}
                  </div>
                  <span className="text-xs leading-tight">{cat.label}</span>
                </button>
              );
            })}
          </div>
          {errors.category && <p className="text-xs text-red-500 mt-2 ml-1 font-semibold">{errors.category.message}</p>}
        </div>

        {/* CONDITION GRID */}
        <div>
          <label className="block text-xs font-bold text-gray-800 mb-2.5 pl-1">
            État de l'article <span className="text-red-500">*</span>
          </label>
          <input type="hidden" {...register('condition', { required: "Choisissez l'état de l'article" })} />
          <div className="grid grid-cols-2 gap-2.5">
            {CONDITIONS.map((cond) => {
              const isSelected = watchCondition === cond.id;
              return (
                <button
                  key={cond.id}
                  type="button"
                  onClick={() => setValue('condition', cond.id, { shouldValidate: true })}
                  className={cn(
                    "flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all cursor-pointer active:scale-95",
                    isSelected
                      ? "border-orange-500 bg-orange-50/50 text-orange-950 font-extrabold shadow-sm ring-2 ring-orange-500/20"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50/50"
                  )}
                >
                  <div className="flex items-center gap-2 w-full mb-1">
                    <div className={isSelected ? 'text-orange-600' : 'text-gray-400'}>
                      {CONDITION_ICONS[cond.id]}
                    </div>
                    <span className="text-xs font-extrabold">{cond.label}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium leading-tight mt-0.5">
                    {CONDITION_DESCRIPTIONS[cond.id]}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.condition && <p className="text-xs text-red-500 mt-2 ml-1 font-semibold">{errors.condition.message}</p>}
        </div>
      </div>
    </div>
  );
};
