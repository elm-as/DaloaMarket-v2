import React from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  style?: React.CSSProperties;
}

const sizeMap: Record<string, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

const colorFromName = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    'bg-primary',
    'bg-secondary',
    'bg-success',
    'bg-warning',
    'bg-error',
    'bg-info',
    '#E65100',
    '#003D7A',
    '#B45309',
    '#0D9488',
    '#7C3AED',
    '#BE185D',
  ];

  const index = Math.abs(hash) % colors.length;
  const color = colors[index];

  if (color.startsWith('#')) {
    return '';
  }
  return color;
};

const getInitials = (name: string | null | undefined): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className,
  style,
}) => {
  const initials = getInitials(name);
  const bgColor = name ? colorFromName(name) : 'bg-gray-300';

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={cn(
          'rounded-full object-cover ring-2 ring-white shadow-sm flex-shrink-0',
          sizeMap[size],
          className
        )}
        style={style}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0',
        bgColor || 'bg-gray-300',
        sizeMap[size],
        className
      )}
      style={style}
      aria-label={name || 'Avatar'}
    >
      <span>{initials}</span>
    </div>
  );
};

export { Avatar };
export default Avatar;
