import React from 'react';
import { cn } from '../../lib/utils';

export type ProBadgeVariant = 'seller' | 'deliverer';
export type ProBadgeTone = 'solid' | 'soft';
export type ProBadgeSize = 'xs' | 'sm' | 'md';

export interface ProBadgeProps {
  /** `seller` affiche « PRO », `deliverer` affiche « VÉRIFIÉ ». */
  variant?: ProBadgeVariant;
  /** `solid` = pastille bleue pleine (par défaut) ; `soft` = fond bleu pâle, pour les fonds déjà colorés. */
  tone?: ProBadgeTone;
  size?: ProBadgeSize;
  /** Masque le libellé et ne garde que la coche — pour les coins d'avatar ou cartes compactes. */
  iconOnly?: boolean;
  /** Anneau blanc de détachement (sur photo ou fond sombre). */
  ring?: boolean;
  label?: string;
  className?: string;
}

const SIZES: Record<ProBadgeSize, { box: string; iconSize: number; dotSize: number }> = {
  xs: { box: 'h-[18px] gap-1 px-1.5 text-[9px]', iconSize: 11, dotSize: 15 },
  sm: { box: 'h-[22px] gap-1.5 px-2 text-[10.5px]', iconSize: 13, dotSize: 18 },
  md: { box: 'h-[26px] gap-1.5 px-2.5 text-[11.5px]', iconSize: 15, dotSize: 22 },
};

/**
 * Sceau officiel Vérifié SVG (Bleu royal éclatant & coche blanche).
 */
export const VerifiedBadgeSvg: React.FC<{
  size?: number;
  className?: string;
  tone?: ProBadgeTone;
  ring?: boolean;
}> = ({ size = 16, className = '', tone = 'solid', ring = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block flex-shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="proMarketBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="55%" stopColor="#1D4ED8" />
        <stop offset="100%" stopColor="#1E40AF" />
      </linearGradient>
    </defs>
    {ring && (
      <path
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.6"
        strokeLinejoin="round"
      />
    )}
    <path
      d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
      fill={tone === 'soft' ? '#1D4ED8' : 'url(#proMarketBlueGrad)'}
    />
    <path
      d="m8.8 12.2 2.2 2.2 4.6-4.6"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Badge Pro / Vérifié — Bleu institutionnel (`#1D4ED8`).
 * Même composant et même rendu que sur DaloaDelivery et mobile.
 */
const ProBadge: React.FC<ProBadgeProps> = ({
  variant = 'seller',
  tone = 'solid',
  size = 'md',
  iconOnly = false,
  ring = false,
  label,
  className,
}) => {
  const s = SIZES[size];
  const text = label ?? (variant === 'deliverer' ? 'VÉRIFIÉ' : 'PRO');
  const title = variant === 'deliverer' ? 'Livreur vérifié par DaloaDelivery' : 'Vendeur Pro vérifié';

  if (iconOnly) {
    return (
      <span
        title={title}
        aria-label={title}
        className={cn('inline-flex items-center justify-center flex-shrink-0 select-none', className)}
      >
        <VerifiedBadgeSvg size={s.dotSize} ring={ring} tone={tone} />
      </span>
    );
  }

  if (tone === 'soft') {
    return (
      <span
        title={title}
        aria-label={title}
        className={cn(
          'inline-flex items-center rounded-full font-black tracking-wider flex-shrink-0 select-none',
          'bg-blue-50 text-blue-700 border border-blue-200/80',
          s.box,
          className
        )}
      >
        <VerifiedBadgeSvg size={s.iconSize} tone="soft" />
        <span className="leading-none pt-px">{text}</span>
      </span>
    );
  }

  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex items-center rounded-full font-black tracking-wider text-white flex-shrink-0 select-none shadow-xs',
        'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 border border-blue-500/30',
        s.box,
        className
      )}
      style={{ boxShadow: 'var(--shadow-pro)' }}
    >
      <VerifiedBadgeSvg size={s.iconSize} tone="solid" />
      <span className="leading-none pt-px">{text}</span>
    </span>
  );
};

export { ProBadge };
export default ProBadge;
