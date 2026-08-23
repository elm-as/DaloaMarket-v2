import React from 'react';
import { Sparkles } from 'lucide-react';
import type { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';
import type { ListingFormValues } from '../../../pages/ListingCreatePage';

interface ListingGeneralInfoSectionProps {
  register: UseFormRegister<ListingFormValues>;
  errors: FieldErrors<ListingFormValues>;
  watchDescription?: string;
  setValue?: UseFormSetValue<ListingFormValues>;
  mode?: 'all' | 'title_only' | 'description_only';
}

const QUICK_DESCRIPTIONS = [
  '✨ Neuf sous emballage',
  '👌 Très bon état, peu utilisé',
  '🤝 Prix discutable',
  '📍 Dispo à Daloa',
  '🚚 Livraison possible',
];

export const ListingGeneralInfoSection: React.FC<ListingGeneralInfoSectionProps> = ({
  register,
  errors,
  watchDescription = '',
  setValue,
  mode = 'all',
}) => {
  const showTitle = mode === 'all' || mode === 'title_only';
  const showDescription = mode === 'all' || mode === 'description_only';

  const appendQuickDescription = (phrase: string) => {
    if (!setValue) return;
    const cleanPhrase = phrase.replace(/^[^\w\sÀ-ÿ]+/, '').trim();
    const current = watchDescription.trim();
    const nextVal = current ? `${current}\n• ${cleanPhrase}` : `• ${cleanPhrase}`;
    setValue('description', nextVal, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className="space-y-4">
      {showTitle && (
        <div>
          <label className="block text-xs font-bold text-gray-800 mb-1.5">
            Titre de l'annonce <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('title', { required: 'Le titre est requis', maxLength: { value: 100, message: '100 caractères max' } })}
            placeholder="Ex: iPhone 15 Pro Max 256 Go"
            maxLength={100}
            className="w-full h-11 px-3.5 rounded-2xl border border-gray-200 bg-gray-50/70 text-sm font-semibold placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-gray-900 shadow-2xs"
          />
          {errors.title && <p className="text-xs text-red-500 font-semibold mt-1 ml-1">{errors.title.message}</p>}
        </div>
      )}

      {showDescription && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-800">
              Description de l'article <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] font-bold text-gray-400">{watchDescription.length}/2000</span>
          </div>

          <textarea
            {...register('description', { required: 'La description est requise', maxLength: { value: 2000, message: '2000 caractères max' } })}
            placeholder="Décrivez votre article : caractéristiques, accessoires fournis, motif de vente..."
            rows={3}
            maxLength={2000}
            className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 bg-gray-50/70 text-sm font-medium placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all resize-none text-gray-900 shadow-2xs"
          />
          {errors.description && <p className="text-xs text-red-500 font-semibold mt-0.5 ml-1">{errors.description.message}</p>}

          {/* Quick chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {QUICK_DESCRIPTIONS.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => appendQuickDescription(phrase)}
                className="inline-flex items-center px-2.5 py-1 rounded-xl bg-orange-50/80 hover:bg-orange-100 border border-orange-200/60 text-[11px] font-bold text-orange-950 transition-all active:scale-95 shadow-2xs"
              >
                <span>{phrase}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingGeneralInfoSection;
