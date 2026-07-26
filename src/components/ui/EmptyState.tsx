import React from 'react';
import { cn } from '../../lib/utils';
import { Package } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-12',
        className,
      )}
    >
      <div className="mb-5 text-[var(--color-on-surface-variant)]">
        {icon || <Package className="w-16 h-16 opacity-40" />}
      </div>
      <h3 className="text-[17px] font-semibold text-[var(--color-on-surface)] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-[14px] text-[var(--color-on-surface-variant)] max-w-xs mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <Button
          variant="outlined"
          color="primary"
          size="md"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};
