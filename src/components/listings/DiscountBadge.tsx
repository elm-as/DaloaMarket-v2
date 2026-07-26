import React from 'react';
import { cn } from '../../lib/utils';

interface DiscountBadgeProps {
  originalPrice: number;
  currentPrice: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function computeDiscount(original: number, current: number): number {
  if (original <= 0 || current >= original) return 0;
  return Math.round(((original - current) / original) * 100);
}

const DiscountBadge: React.FC<DiscountBadgeProps> = ({
  originalPrice,
  currentPrice,
  size = 'md',
  className,
}) => {
  const discount = computeDiscount(originalPrice, currentPrice);
  if (discount <= 0) return null;

  const isHigh = discount >= 50;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-bold rounded-full',
        isHigh
          ? 'bg-red-500 text-white animate-pulse shadow-md'
          : 'bg-amber-100 text-amber-800',
        sizeClasses[size],
        className
      )}
    >
      -{discount}%
    </span>
  );
};

export { DiscountBadge };
export default DiscountBadge;
