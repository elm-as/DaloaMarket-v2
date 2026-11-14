import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { WebPromoBanner } from './promoBannerConfig';

interface PromoBannerSlideProps {
  banner: WebPromoBanner;
  index: number;
  total: number;
  onSelect: (banner: WebPromoBanner) => void;
}

/**
 * Affiche visuelle d'une slide du carrousel d'accueil Web.
 */
export const PromoBannerSlide: React.FC<PromoBannerSlideProps> = ({
  banner,
  index,
  total,
  onSelect,
}) => (
  <div
    role="group"
    aria-roledescription="slide"
    aria-label={`${index + 1} sur ${total}`}
    className="w-full shrink-0 snap-center"
  >
    <button
      type="button"
      onClick={() => onSelect(banner)}
      className="group relative flex h-48 sm:h-56 lg:h-[252px] w-full flex-col justify-between p-4 sm:p-6 text-left"
    >
      <img
        src={banner.image_url}
        alt={banner.title}
        loading="eager"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/15" />

      <div className="relative z-10 flex items-center justify-between gap-2 w-full">
        {banner.badge_text ? (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase"
            style={{ backgroundColor: banner.badge_color || '#EA580C' }}
          >
            {banner.badge_text}
          </span>
        ) : <span />}

        <div className="flex items-center gap-1.5">
          {banner.sponsor_name && (
            <span className="rounded-full bg-slate-900/75 border border-white/20 px-2.5 py-0.5 text-[10px] font-semibold text-white truncate max-w-[140px]">
              {banner.sponsor_name}
            </span>
          )}
          {total > 1 && (
            <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
              {index + 1}/{total}
            </span>
          )}
        </div>
      </div>

      <div className="relative z-10 flex items-end justify-between gap-3 w-full">
        <div className="min-w-0 flex-1 space-y-0.5">
          <h3 className="text-sm sm:text-lg font-black text-white leading-tight line-clamp-1">
            {banner.title}
          </h3>
          {banner.subtitle && (
            <p className="max-w-lg text-[11px] sm:text-xs text-white/90 font-medium line-clamp-1 sm:line-clamp-2">
              {banner.subtitle}
            </p>
          )}
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-orange-600 px-3 py-1.5 text-[11px] font-bold text-white group-hover:bg-orange-500 transition-colors">
          <span>Découvrir</span>
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  </div>
);
