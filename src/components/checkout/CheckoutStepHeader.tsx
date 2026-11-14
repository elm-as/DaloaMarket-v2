import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { CheckoutStep, DeliveryMode } from './checkout.types';

interface CheckoutStepHeaderProps {
  title: string;
  step: CheckoutStep;
  deliveryMode: DeliveryMode;
  onBack: () => void;
  onSelectStep: (step: CheckoutStep) => void;
}

const STEP_LABELS: Array<{ id: CheckoutStep; label: string }> = [
  { id: 1, label: 'Réception' },
  { id: 2, label: 'Adresse' },
  { id: 3, label: 'Paiement' },
];

export const CheckoutStepHeader: React.FC<CheckoutStepHeaderProps> = ({
  title,
  step,
  deliveryMode,
  onBack,
  onSelectStep,
}) => {
  const progressWidth = step === 1 ? '0%' : step === 2 ? '50%' : 'calc(100% - 4rem)';

  return (
    <>
      <header className="border-b border-stone-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="truncate text-base font-bold text-stone-900">{title}</h1>
        </div>
      </header>

      <div className="relative z-20 mx-auto mt-3 max-w-2xl px-4">
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <div className="relative flex items-center justify-between px-3">
            <div className="absolute left-8 right-8 top-1/2 z-0 h-1 -translate-y-1/2 rounded-full bg-stone-100" />
            <div
              className="absolute left-8 top-1/2 z-0 h-1 -translate-y-1/2 origin-left rounded-full bg-[var(--color-primary)] transition-all duration-300"
              style={{ width: progressWidth }}
            />

            {STEP_LABELS.map((item) => {
              const isDone = step > item.id;
              const isCurrent = step === item.id;
              const isDisabled = item.id === 2 && deliveryMode === 'pickup';

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onSelectStep(item.id)}
                  className={cn(
                    'relative z-10 flex flex-col items-center gap-1 focus:outline-none',
                    isDisabled && 'cursor-not-allowed opacity-40'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold tabular-nums transition-colors',
                      isCurrent
                        ? 'bg-[var(--color-primary)] text-white ring-4 ring-orange-500/15'
                        : isDone
                          ? 'bg-emerald-600 text-white'
                          : 'border border-stone-200 bg-white text-stone-400'
                    )}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : item.id}
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-semibold transition-colors',
                      isCurrent ? 'text-[var(--color-primary)]' : isDone ? 'text-stone-800' : 'text-stone-400'
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
