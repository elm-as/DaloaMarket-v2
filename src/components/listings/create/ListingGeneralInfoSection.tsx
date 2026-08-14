import React from 'react';
import { FileText, AlignLeft, Sparkles } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { ListingFormValues } from '../../../pages/ListingCreatePage';

interface ListingGeneralInfoSectionProps {
  register: UseFormRegister<ListingFormValues>;
  errors: FieldErrors<ListingFormValues>;
  watchDescription?: string;
  mode?: 'all' | 'title_only' | 'description_only';
}

export const ListingGeneralInfoSection: React.FC<ListingGeneralInfoSectionProps> = ({
  register,
  errors,
  watchDescription = '',
  mode = 'all',
}) => {
  const showTitle = mode === 'all' || mode === 'title_only';
  const showDescription = mode === 'all' || mode === 'description_only';

  return (
    <section className="space-y-4">
      {showTitle && (
        <div>
          <div className="flex items-center gap-2.5 mb-2.5 px-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-orange-50 text-orange-600">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">Titre de votre annonce</h2>
              <p className="text-[11px] font-medium text-gray-500">Un titre clair attire plus d'acheteurs</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-lg shadow-gray-200/50">
            <label className="block text-xs font-bold text-gray-800 mb-1.5 pl-1">
              Titre du produit <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('title', { required: 'Le titre est requis', maxLength: { value: 100, message: '100 caractères max' } })}
              placeholder="Ex: iPhone 13 Pro Max 256Go Bleu Alpin"
              maxLength={100}
              className="w-full h-12 px-4 rounded-2xl border border-gray-200 bg-gray-50/70 text-sm font-semibold placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-gray-900"
            />
            {errors.title && <p className="text-xs text-red-500 font-semibold mt-1.5 ml-1">{errors.title.message}</p>}
          </div>
        </div>
      )}

      {showDescription && (
        <div>
          <div className="flex items-center gap-2.5 mb-2.5 px-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-orange-50 text-orange-600">
              <AlignLeft className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">Description détaillée</h2>
              <p className="text-[11px] font-medium text-gray-500">Détails, caractéristiques, état général</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-lg shadow-gray-200/50 space-y-2">
            <label className="block text-xs font-bold text-gray-800 pl-1">
              Description de l'article <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('description', { required: 'La description est requise', maxLength: { value: 2000, message: '2000 caractères max' } })}
              placeholder="Décrivez précisément votre article : caractéristiques, accessoires fournis, garantie, motif de vente..."
              rows={4}
              maxLength={2000}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/70 text-sm font-medium placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all resize-none text-gray-900"
            />
            <div className="flex justify-between items-center px-1">
              {errors.description ? (
                <p className="text-xs text-red-500 font-semibold">{errors.description.message}</p>
              ) : <span />}
              <span className="text-[11px] font-bold text-gray-400">{watchDescription.length}/2000</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
