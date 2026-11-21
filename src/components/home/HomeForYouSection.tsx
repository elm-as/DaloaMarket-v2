import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { formatPrice, getListingPath, getOptimizedImageUrl } from '../../lib/utils';
import { resolveListingPhoto } from '../../lib/availability';
import FavoriteButton from '../listings/FavoriteButton';

interface HomeForYouSectionProps {
  recommendations: Array<{
    item: any;
    score: number;
    matchReason?: string;
    similarityPercent?: number;
  }>;
}

const TRENDING_REASONS = new Set(['Populaire à Daloa', 'En vedette']);

/**
 * Section « Pour vous » : cartes portrait sobres et lisibles, carrousel horizontal
 * sur mobile et grille 4 colonnes sur grand écran.
 */
export const HomeForYouSection: React.FC<HomeForYouSectionProps> = ({ recommendations }) => {
  const items = (recommendations || []).slice(0, 8);
  if (items.length === 0) return null;

  const personal = items.some((r) => r.matchReason && !TRENDING_REASONS.has(r.matchReason));

  return (
    <section className="pt-3 pb-4" aria-labelledby="for-you-title">
      <div className="max-w-5xl mx-auto lg:px-8">
        <div className="flex items-baseline justify-between gap-2 px-4 lg:px-1 mb-2.5">
          <div>
            <h2 id="for-you-title" className="text-base sm:text-lg font-bold tracking-tight text-gray-900">
              Pour vous
            </h2>
            <p className="text-xs text-gray-500">
              {personal ? 'Selon vos consultations récentes' : 'Sélection active à Daloa'}
            </p>
          </div>
          <span className="text-xs font-medium text-gray-400 tabular-nums">
            {items.length} articles
          </span>
        </div>

        <ul className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-1">
          {items.map(({ item }) => {
            const photoUrl = resolveListingPhoto(item.photos);
            const path = getListingPath(item.id, item.title);

            return (
              <li
                key={`foryou-${item.id}`}
                className="group relative w-[43%] min-w-[152px] max-w-[186px] shrink-0 snap-start rounded-xl border border-gray-200/80 bg-white overflow-hidden transition-colors hover:border-orange-300 lg:w-auto lg:max-w-none"
              >
                <Link to={path} className="block">
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    <img
                      src={getOptimizedImageUrl(photoUrl, 360, 270)}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-2.5 space-y-1">
                    <p className="text-sm font-bold tabular-nums text-[var(--color-primary-dark)] leading-tight">
                      {formatPrice(item.price)}
                    </p>
                    <p className="line-clamp-1 text-xs sm:text-[13px] font-semibold text-gray-900 group-hover:text-orange-600">
                      {item.title}
                    </p>
                    <p className="flex items-center gap-1 text-[11px] text-gray-500">
                      <MapPin size={11} className="shrink-0 text-gray-400" />
                      <span className="truncate">{item.district || 'Daloa'}</span>
                    </p>
                  </div>
                </Link>
                {/* Hors du lien : cliquer le cœur ne doit pas ouvrir l'annonce. */}
                <div className="absolute right-1.5 top-1.5 rounded-full bg-black/30 backdrop-blur-xs">
                  <FavoriteButton listingId={item.id} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
