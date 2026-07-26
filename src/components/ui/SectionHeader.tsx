import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface SectionHeaderProps {
  title: string;
  action?: SectionHeaderAction;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3',
        className,
      )}
    >
      <h2 className="text-[20px] font-bold text-[var(--color-on-surface)]">
        {title}
      </h2>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-1 min-h-[44px] min-w-[44px] px-2 text-[14px] font-semibold text-[var(--color-primary)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary-50)] active:scale-[0.97] transition-all duration-[var(--motion-fast)]"
        >
          <span>{action.label}</span>
          {action.icon || <ChevronRight className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
};
