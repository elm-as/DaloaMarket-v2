import React from 'react';
import { cn } from '../../lib/utils';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Une erreur est survenue',
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-12',
        className,
      )}
    >
      <div className="mb-5 flex items-center justify-center w-16 h-16 rounded-[var(--radius-full)] bg-[var(--color-error-light)]">
        <AlertTriangle className="w-8 h-8 text-[var(--color-error)]" />
      </div>
      <h3 className="text-[17px] font-semibold text-[var(--color-on-surface)] mb-2">
        Oups !
      </h3>
      <p className="text-[14px] text-[var(--color-on-surface-variant)] max-w-xs mb-6 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button variant="tonal" color="error" size="md" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
};
