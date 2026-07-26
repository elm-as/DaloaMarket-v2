import React from 'react';
import { cn } from '../../lib/utils';

type SkeletonRounded = 'sm' | 'md' | 'lg' | 'full';

interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: SkeletonRounded;
  className?: string;
}

const roundedStyles: Record<SkeletonRounded, string> = {
  sm: 'rounded-[var(--radius-sm)]',
  md: 'rounded-[var(--radius-md)]',
  lg: 'rounded-[var(--radius-lg)]',
  full: 'rounded-[var(--radius-full)]',
};

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  rounded = 'md',
  className,
}) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200',
        roundedStyles[rounded],
        className,
      )}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
};
