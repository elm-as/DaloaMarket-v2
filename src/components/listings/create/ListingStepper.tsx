import React from 'react';
import { motion } from 'framer-motion';
import { Check, Camera, Tag, Eye } from 'lucide-react';

interface Step {
  id: number;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const steps: Step[] = [
  { id: 1, label: 'Photos & Info', shortLabel: 'Media', icon: Camera },
  { id: 2, label: 'Prix & Stock', shortLabel: 'Prix', icon: Tag },
  { id: 3, label: 'Aperçu & Publier', shortLabel: 'Aperçu', icon: Eye },
];

interface ListingStepperProps {
  currentStep: number;
  onStepClick: (stepId: number) => void;
}

export const ListingStepper: React.FC<ListingStepperProps> = ({ currentStep, onStepClick }) => {
  return (
    <div className="w-full max-w-lg mx-auto px-4 py-3 mb-2">
      <div className="relative flex items-center justify-between">
        {/* Background Track Line */}
        <div className="absolute top-1/2 left-6 right-6 h-1 bg-gray-100 -translate-y-1/2 z-0 rounded-full" />
        
        {/* Animated Progress Line */}
        <motion.div
          className="absolute top-1/2 left-6 h-1 bg-gradient-to-r from-orange-500 to-amber-500 -translate-y-1/2 z-0 rounded-full origin-left"
          animate={{
            width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%',
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{ maxWidth: 'calc(100% - 3rem)' }}
        />

        {steps.map((step) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              onClick={() => {
                if (step.id < currentStep) onStepClick(step.id);
              }}
              className={`relative z-10 flex flex-col items-center group ${
                step.id < currentStep ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                  isCompleted
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-green-500/20'
                    : isActive
                    ? 'bg-gradient-to-br from-[#FF7F00] to-orange-600 text-white shadow-orange-500/30 ring-4 ring-orange-500/15'
                    : 'bg-white text-gray-400 border border-gray-200'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 stroke-[3]" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </motion.button>

              <span
                className={`text-[11px] font-semibold mt-1.5 transition-colors ${
                  isActive
                    ? 'text-[#FF7F00]'
                    : isCompleted
                    ? 'text-gray-700'
                    : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
