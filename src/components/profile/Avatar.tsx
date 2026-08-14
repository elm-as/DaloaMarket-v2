import React, { useState } from 'react';
import { User } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  style?: React.CSSProperties;
}

const sizeMap: Record<string, { container: string; icon: string }> = {
  xs: { container: 'h-6 w-6', icon: 'w-3.5 h-3.5' },
  sm: { container: 'h-8 w-8', icon: 'w-4.5 h-4.5' },
  md: { container: 'h-10 w-10', icon: 'w-5 h-5' },
  lg: { container: 'h-14 w-14', icon: 'w-7 h-7' },
  xl: { container: 'h-20 w-20', icon: 'w-10 h-10' },
  '2xl': { container: 'h-24 w-24', icon: 'w-12 h-12' },
};

const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className,
  style,
}) => {
  const [imgError, setImgError] = useState(false);
  const sizeConfig = sizeMap[size] || sizeMap.md;

  // 1. Photo de profil utilisateur (si disponible et chargée avec succès)
  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name || 'Photo de profil'}
        onError={() => setImgError(true)}
        className={cn(
          'rounded-full object-cover ring-2 ring-white shadow-sm flex-shrink-0 bg-gray-100',
          sizeConfig.container,
          className
        )}
        style={style}
      />
    );
  }

  // 2. Placeholder sobre, épuré et moderne (silhouette neutre style iOS / Apple)
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100/90 text-gray-400 border border-gray-200/70 shadow-sm select-none',
        sizeConfig.container,
        className
      )}
      style={style}
      aria-label={name || 'Avatar'}
      title={name || undefined}
    >
      <User className={cn(sizeConfig.icon, 'text-gray-400 stroke-[1.8]')} />
    </div>
  );
};

export { Avatar };
export default Avatar;
