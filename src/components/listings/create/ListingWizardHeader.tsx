import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { WEB_WIZARD_STEPS } from './listingCreatePayload';

interface ListingWizardHeaderProps {
  currentStep: number;
  isEditing: boolean;
  isDraftRestored: boolean;
  onBack: () => void;
  onStepSelect: (step: number) => void;
  onResetDraft: () => void;
}

export const ListingWizardHeader: React.FC<ListingWizardHeaderProps> = ({
  currentStep,
  isEditing,
  isDraftRestored,
  onBack,
  onStepSelect,
  onResetDraft,
}) => {
  const total = WEB_WIZARD_STEPS.length;
  const percent = Math.round((currentStep / total) * 100);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Retour"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                {isEditing ? "Modifier l'annonce" : 'Publier une annonce'}
              </h1>
              <p className="text-xs text-slate-500">
                {WEB_WIZARD_STEPS[currentStep - 1]?.label}
              </p>
            </div>
          </div>

          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 tabular-nums">
            Étape {currentStep}/{total}
          </span>
        </div>

        <div className="mx-auto mt-2.5 max-w-2xl">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-orange-600 transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>

          <nav aria-label="Étapes de création" className="mt-2.5 grid grid-cols-3 gap-2">
            {WEB_WIZARD_STEPS.map((step) => {
              const active = step.id === currentStep;
              const completed = step.id < currentStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => onStepSelect(step.id)}
                  className={cn(
                    'flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition-colors',
                    active && 'border-orange-600 bg-orange-50 text-orange-900',
                    completed && 'border-emerald-200 bg-emerald-50 text-emerald-800',
                    !active && !completed && 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                  )}
                >
                  {completed ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="tabular-nums font-bold">{step.id}.</span>
                  )}
                  <span className="truncate">{step.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {isDraftRestored && !isEditing && (
        <div className="mx-auto mt-3 max-w-2xl px-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-900">
            <span className="font-semibold">Brouillon repris là où vous vous étiez arrêté</span>
            <button
              type="button"
              onClick={onResetDraft}
              className="shrink-0 font-bold text-amber-800 underline hover:text-red-700"
            >
              Recommencer
            </button>
          </div>
        </div>
      )}
    </>
  );
};
