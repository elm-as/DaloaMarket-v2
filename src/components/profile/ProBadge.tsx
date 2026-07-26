import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ProBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

const ProBadge: React.FC<ProBadgeProps> = ({ size = 'md', className }) => {
  const isSm = size === 'sm';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-bold text-white rounded-full',
        isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        className
      )}
      style={{ background: 'var(--gradient-pro)' }}
    >
      <Star
        className={isSm ? 'h-3 w-3' : 'h-3.5 w-3.5'}
        fill="currentColor"
      />
      PRO
    </span>
  );
};

export { ProBadge };
export default ProBadge;
