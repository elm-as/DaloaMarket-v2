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
        'flex items-center justify-between gap-2 px-1 py-2',
        className,
      )}
    >
      <h2 className="text-sm sm:text-base font-black tracking-tight text-gray-900 truncate flex-1 min-w-0">
        {title}
      </h2>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-0.5 text-xs font-black text-primary hover:opacity-80 active:scale-95 transition-all flex-shrink-0 whitespace-nowrap py-1 px-1.5 rounded-lg hover:bg-orange-50"
        >
          <span>{action.label}</span>
          {action.icon || <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
};
