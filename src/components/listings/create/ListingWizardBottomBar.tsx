import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { LoadingSpinner } from '../../ui/LoadingSpinner';

interface ListingWizardBottomBarProps {
  currentStep: number;
  isEditing: boolean;
  submitting: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

/**
 * Barre d'action fixe en bas de l'assistant de création/édition d'annonce.
 */
export const ListingWizardBottomBar: React.FC<ListingWizardBottomBarProps> = ({
  currentStep,
  isEditing,
  submitting,
  onPrevious,
  onNext,
  onSubmit,
}) => (
  <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white px-4 py-3">
    <div className="mx-auto flex max-w-2xl items-center gap-3">
      {currentStep > 1 && (
        <button
          type="button"
          onClick={onPrevious}
          className="min-h-[48px] shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          Précédent
        </button>
      )}

      {currentStep < 3 ? (
        <button
          type="button"
          onClick={onNext}
          className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-bold text-white hover:bg-orange-700 transition-colors"
        >
          <span>Continuer</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          disabled={submitting}
          onClick={onSubmit}
          className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
        >
          {submitting ? (
            <LoadingSpinner size="sm" className="text-white" />
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>{isEditing ? 'Enregistrer' : 'Publier mon annonce'}</span>
            </>
          )}
        </button>
      )}
    </div>
  </div>
);
