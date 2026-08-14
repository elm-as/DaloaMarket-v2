import React from 'react';
import { Camera, Tag, MapPin, Check } from 'lucide-react';

interface StepInfo {
  id: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const steps: StepInfo[] = [
  { id: 1, label: 'Photos & Type', icon: Camera },
  { id: 2, label: 'Prix & Stock', icon: Tag },
  { id: 3, label: 'Contact', icon: MapPin },
];

interface ListingStepperProps {
  currentStep: number;
  onStepClick: (stepId: number) => void;
}

export const ListingStepper: React.FC<ListingStepperProps> = ({ currentStep, onStepClick }) => {
  return (
    <div className="w-full select-none">
      {/* 3 Step Pills Row */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        {steps.map((step, idx) => {
          const isDone = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => isDone && onStepClick(step.id)}
                disabled={!isDone}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl transition-all min-w-0 ${
                  isCurrent
                    ? 'bg-gradient-to-r from-orange-50 to-amber-50/80 text-orange-600 border border-orange-200 shadow-sm ring-2 ring-orange-500/10 font-black'
                    : isDone
                    ? 'bg-emerald-50/80 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100/80 cursor-pointer font-bold shadow-2xs'
                    : 'bg-gray-50/80 text-gray-400 border border-gray-100 font-semibold cursor-default'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-transform ${
                    isCurrent
                      ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/30 scale-105'
                      : isDone
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-gray-200/80 text-gray-500'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.id}
                </div>
                <span className="text-[11px] sm:text-xs truncate tracking-tight">{step.label}</span>
              </button>

              {idx < steps.length - 1 && (
                <div
                  className={`w-2 sm:w-3 h-0.5 rounded-full shrink-0 transition-colors ${
                    currentStep > idx + 1 ? 'bg-emerald-400' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
