import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, MapPin } from 'lucide-react';
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

/** Raisons posées par la tendance : sans elles, la sélection est vraiment personnelle. */
const TRENDING_REASONS = new Set(['Populaire à Daloa', 'En vedette']);

/**
 * « Pour vous » : un carrousel horizontal de cartes photo (2 cartes et demie
 * visibles sur téléphone, défilement aimanté), en grille sur grand écran.
 */
export const HomeForYouSection: React.FC<HomeForYouSectionProps> = ({ recommendations }) => {
  const items = (recommendations || []).slice(0, 8);
  if (items.length === 0) return null;

  const personal = items.some((r) => r.matchReason && !TRENDING_REASONS.has(r.matchReason));

  return (
    <section className="pt-2 pb-5" aria-labelledby="for-you-title">
      <div className="max-w-5xl mx-auto lg:px-8">
        <div className="flex items-center gap-2.5 px-4 lg:px-1 mb-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center text-[var(--color-primary)]">
            <Sparkles size={16} />
          </div>
          <div className="min-w-0">
            <h2 id="for-you-title" className="text-base font-bold text-gray-900 leading-tight">
              Pour vous
            </h2>
            <p className="text-xs text-gray-500">
              {personal ? 'D’après les articles que vous regardez' : 'Les articles les plus demandés à Daloa'}
            </p>
          </div>
        </div>

        <ul
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-1"
        >
          {items.map(({ item, matchReason, similarityPercent }) => {
            const photoUrl = resolveListingPhoto(item.photos);
            const path = getListingPath(item.id, item.title);
            const reason =
              similarityPercent && similarityPercent > 70 ? `${similarityPercent} % pour vous` : matchReason || 'Pour vous';

            return (
              <li
                key={`foryou-${item.id}`}
                className="group relative w-[40%] min-w-[148px] max-w-[190px] shrink-0 snap-start lg:w-auto lg:max-w-none"
              >
                <Link to={path} className="block">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gray-100">
                    <img
                      src={getOptimizedImageUrl(photoUrl, 360, 450)}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />
                    <span className="absolute bottom-2 left-2 right-2 truncate text-[11px] font-medium text-white">
                      {reason}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-snug text-gray-800 group-hover:text-gray-950">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-[var(--color-primary-dark)]">
                    {formatPrice(item.price)}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                    <MapPin size={10} className="shrink-0" />
                    <span className="truncate">{item.district || 'Daloa'}</span>
                  </p>
                </Link>
                {/* Hors du lien : cliquer le cœur ne doit pas ouvrir l'annonce. */}
                <div className="absolute right-1.5 top-1.5 rounded-full bg-black/25 backdrop-blur-sm">
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
