import React from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

type ChipColor = 'default' | 'primary' | 'success' | 'error' | 'warning';
type ChipSize = 'sm' | 'md';

interface ChipProps {
  selected?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  onDelete?: () => void;
  color?: ChipColor;
  size?: ChipSize;
  className?: string;
  children: React.ReactNode;
}

const colorStyles: Record<ChipColor, { default: string; selected: string }> = {
  default: {
    default: 'bg-gray-100 text-gray-700',
    selected: 'bg-gray-200 text-gray-800',
  },
  primary: {
    default: 'bg-gray-100 text-gray-700',
    selected: 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]',
  },
  success: {
    default: 'bg-gray-100 text-gray-700',
    selected: 'bg-[var(--color-success-light)] text-emerald-700',
  },
  error: {
    default: 'bg-gray-100 text-gray-700',
    selected: 'bg-[var(--color-error-light)] text-red-700',
  },
  warning: {
    default: 'bg-gray-100 text-gray-700',
    selected: 'bg-[var(--color-warning-light)] text-amber-700',
  },
};

const sizeStyles: Record<ChipSize, string> = {
  sm: 'h-7 px-2.5 text-[12px] gap-1',
  md: 'h-9 px-3.5 text-[14px] gap-1.5',
};

export const Chip: React.FC<ChipProps> = ({
  selected = false,
  icon,
  onClick,
  onDelete,
  color = 'default',
  size = 'md',
  className,
  children,
}) => {
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center font-medium rounded-[var(--radius-full)] transition-all duration-[var(--motion-fast)] active:scale-[0.97] select-none',
        onClick ? 'cursor-pointer' : '',
        selected ? colorStyles[color].selected : colorStyles[color].default,
        sizeStyles[size],
        className,
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-black/10 active:scale-[0.9] transition-all duration-[var(--motion-fast)]"
          aria-label="Supprimer"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};
