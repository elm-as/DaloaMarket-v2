import React from 'react';
import { FileText } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Card } from '../../ui/Card';
import type { ListingFormValues } from '../../../pages/ListingCreatePage';

interface ListingGeneralInfoSectionProps {
  register: UseFormRegister<ListingFormValues>;
  errors: FieldErrors<ListingFormValues>;
  watchDescription: string;
}

export const ListingGeneralInfoSection: React.FC<ListingGeneralInfoSectionProps> = ({
  register,
  errors,
  watchDescription,
}) => {
  return (
    <section>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary-50)' }}>
          <FileText className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
        </div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)' }}>Informations générales</h2>
      </div>

      <Card elevation={1} padding="md" className="rounded-2xl space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-on-surface)' }}>
            Titre <span className="text-[var(--color-error)]">*</span>
          </label>
          <input
            type="text"
            {...register('title', { required: 'Le titre est requis', maxLength: { value: 100, message: '100 caracteres max' } })}
            placeholder="Ex: iPhone 13 Pro Max 256Go"
            maxLength={100}
            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
            style={{ color: 'var(--color-on-surface)' }}
          />
          {errors.title && <p className="text-xs text-[var(--color-error)] mt-1 ml-1">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-on-surface)' }}>
            Description <span className="text-[var(--color-error)]">*</span>
          </label>
          <textarea
            {...register('description', { required: 'La description est requise', maxLength: { value: 2000, message: '2000 caracteres max' } })}
            placeholder="Décrivez votre article (état, couleur, taille...)"
            rows={4}
            maxLength={2000}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all resize-none"
            style={{ color: 'var(--color-on-surface)' }}
          />
          <div className="flex justify-between mt-1">
            {errors.description ? (
              <p className="text-xs text-[var(--color-error)]">{errors.description.message}</p>
            ) : <span />}
            <span className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>{watchDescription.length}/2000</span>
          </div>
        </div>
      </Card>
    </section>
  );
};
