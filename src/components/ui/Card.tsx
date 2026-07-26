import React from 'react';
import { cn } from '../../lib/utils';

type CardElevation = 1 | 2 | 3 | 4;
type CardPadding = 'sm' | 'md' | 'lg';

interface CardProps {
  elevation?: CardElevation;
  padding?: CardPadding;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

const elevationStyles: Record<CardElevation, string> = {
  1: 'shadow-[var(--elevation-1)]',
  2: 'shadow-[var(--elevation-2)]',
  3: 'shadow-[var(--elevation-3)]',
  4: 'shadow-[var(--elevation-4)]',
};

const hoverElevationStyles: Record<CardElevation, string> = {
  1: 'hover:shadow-[var(--elevation-2)]',
  2: 'hover:shadow-[var(--elevation-3)]',
  3: 'hover:shadow-[var(--elevation-4)]',
  4: 'hover:shadow-[var(--elevation-4)]',
};

const paddingStyles: Record<CardPadding, string> = {
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6 sm:p-8',
};

export const Card: React.FC<CardProps> = ({
  elevation = 2,
  padding = 'md',
  onClick,
  className,
  children,
}) => {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={cn(
        'bg-[var(--color-surface)] rounded-[var(--radius-lg)]',
        elevationStyles[elevation],
        paddingStyles[padding],
        onClick && [
          'cursor-pointer transition-all duration-[var(--motion-fast)]',
          hoverElevationStyles[elevation],
          'hover:-translate-y-0.5',
          'active:scale-[0.985]',
          'text-left w-full',
        ],
        className,
      )}
    >
      {children}
    </Component>
  );
};
