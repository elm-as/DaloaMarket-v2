import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Flame, MapPin, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { formatPrice, getListingPath, getOptimizedImageUrl } from '../../lib/utils';
import { resolveListingPhoto } from '../../lib/availability';
import FavoriteButton from '../listings/FavoriteButton';

interface HomeTrendingSectionProps {
  recommendations: Array<{
    item: any;
    score: number;
    matchReason?: string;
  }>;
}

export const HomeTrendingSection: React.FC<HomeTrendingSectionProps> = ({ recommendations }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const items = (recommendations || []).slice(0, 8);

  if (items.length === 0) return null;

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const distance = 380;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  return (
    <section className="pt-2 pb-4">
      <div className="px-4 lg:px-8 max-w-5xl mx-auto">
        {/* En-tête Top Chart / Vélocité Urbaine */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600">
              <Flame size={18} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                  Populaire à Daloa
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-700 font-mono tabular-nums">
                  Top 8
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Les articles avec la plus forte vélocité en ville
              </p>
            </div>
          </div>

          {/* Boutons de navigation défilement */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={() => handleScroll('left')}
              className="w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 transition"
              aria-label="Précédent"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 transition"
              aria-label="Suivant"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Ruban horizontal Billboard avec badges numérotés */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory"
        >
          {items.map(({ item, matchReason }, index) => {
            const rank = index + 1;
            const rankStr = rank < 10 ? `0${rank}` : `${rank}`;
            const isTop3 = rank <= 3;
            const photoUrl = resolveListingPhoto(item);
            const optimizedPhoto = getOptimizedImageUrl(photoUrl, 320, 240);

            return (
              <div
                key={`trending-${item.id}`}
                className="w-44 sm:w-48 shrink-0 snap-start bg-white rounded-2xl border border-gray-200/90 shadow-2xs hover:shadow-md transition-all group overflow-hidden flex flex-col justify-between"
              >
                <div className="relative aspect-4/3 bg-gray-100 overflow-hidden">
                  <Link to={getListingPath(item.id, item.title)} className="block w-full h-full">
                    {photoUrl ? (
                      <img
                        src={optimizedPhoto}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                        <ShoppingBag size={24} />
                      </div>
                    )}
                  </Link>

                  {/* Badge de Rang Top Chart (#01, #02...) */}
                  <div
                    className={`absolute top-2 left-2 px-2 py-0.5 rounded-md border text-[11px] font-black font-mono tabular-nums shadow-xs ${
                      isTop3
                        ? 'bg-slate-900 border-orange-500 text-orange-400'
                        : 'bg-slate-900/85 border-white/20 text-slate-200'
                    }`}
                  >
                    #{rankStr}
                  </div>

                  {/* Bouton favori */}
                  <div className="absolute top-2 right-2">
                    <FavoriteButton listingId={item.id} />
                  </div>

                  {/* Tag de forte demande */}
                  {matchReason && (
                    <div className="absolute bottom-2 left-2 bg-orange-50/95 border border-orange-200/80 px-1.5 py-0.5 rounded text-[9.5px] font-bold text-orange-950 flex items-center gap-1 shadow-2xs">
                      <Flame size={10} className="text-orange-600" />
                      <span>{matchReason.replace('Populaire à Daloa', 'Forte demande')}</span>
                    </div>
                  )}
                </div>

                <div className="p-2.5 flex flex-col justify-between flex-1 gap-1.5">
                  <div>
                    <span className="font-mono tabular-nums font-black text-sm text-primary">
                      {formatPrice(item.price)}
                    </span>
                    <Link
                      to={getListingPath(item.id, item.title)}
                      className="block text-xs font-semibold text-gray-800 hover:text-primary line-clamp-2 mt-0.5"
                    >
                      {item.title}
                    </Link>
                  </div>

                  <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                    <span className="flex items-center gap-1 truncate max-w-[110px]">
                      <MapPin size={10} className="text-gray-400 shrink-0" />
                      <span className="truncate">{item.district || 'Daloa'}</span>
                    </span>
                    <Link
                      to={getListingPath(item.id, item.title)}
                      className="text-[10px] font-bold text-primary hover:underline shrink-0"
                    >
                      Voir
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
