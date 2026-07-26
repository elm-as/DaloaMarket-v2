import React from 'react';
import { cn } from '../../lib/utils';
import { getConditionLabel } from '../../lib/utils';

interface ConditionBadgeProps {
  condition: string;
  className?: string;
}

const conditionStyles: Record<string, string> = {
  new: 'bg-success-light text-success',
  like_new: 'bg-info-light text-info',
  good: 'bg-warning-light text-amber-700',
  used: 'bg-gray-100 text-gray-600',
};

const ConditionBadge: React.FC<ConditionBadgeProps> = ({ condition, className }) => {
  const style = conditionStyles[condition] || conditionStyles.used;
  const label = getConditionLabel(condition);

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold leading-tight',
        style,
        className
      )}
    >
      {label}
    </span>
  );
};

export { ConditionBadge };
export default ConditionBadge;
