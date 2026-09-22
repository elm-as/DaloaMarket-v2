import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, MapPin, Target, ShoppingBag, Compass } from 'lucide-react';
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

export const HomeForYouSection: React.FC<HomeForYouSectionProps> = ({ recommendations }) => {
  const items = (recommendations || []).slice(0, 6);

  if (items.length === 0) return null;

  return (
    <section className="pt-2 pb-4">
      <div className="px-4 lg:px-8 max-w-5xl mx-auto">
        {/* Conteneur Bento Curation Personnalisée */}
        <div className="rounded-3xl border border-emerald-100 bg-linear-to-br from-emerald-50/40 via-white to-slate-50/60 p-4 sm:p-5 shadow-2xs">
          {/* En-tête Curation & Match Personnalisé */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Sparkles size={17} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                    Pour vous
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    <Target size={10} />
                    Sur-mesure
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Sélectionné d’après vos favoris et vos consultations
                </p>
              </div>
            </div>
          </div>

          {/* Grille de Fiches Horizontales / Format Paysage (Split Image / Infos) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map(({ item, matchReason, similarityPercent }) => {
              const photoUrl = resolveListingPhoto(item);
              const optimizedPhoto = getOptimizedImageUrl(photoUrl, 200, 200);

              const affinityLabel = similarityPercent && similarityPercent > 70
                ? `${similarityPercent}% affinité`
                : (matchReason || 'Suggéré pour vous');

              return (
                <div
                  key={`foryou-${item.id}`}
                  className="bg-white rounded-2xl border border-gray-200/80 p-2.5 flex gap-3 shadow-2xs hover:shadow-sm hover:border-emerald-200 transition-all group relative overflow-hidden"
                >
                  {/* Photo carrée gauche */}
                  <div className="relative w-20 h-20 sm:w-22 sm:h-22 shrink-0 rounded-xl overflow-hidden bg-gray-100">
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
                          <ShoppingBag size={20} />
                        </div>
                      )}
                    </Link>

                    {/* Favori discret */}
                    <div className="absolute top-1.5 left-1.5 scale-90">
                      <FavoriteButton listingId={item.id} />
                    </div>
                  </div>

                  {/* Détails fiche affinité à droite */}
                  <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                    <div>
                      {/* Tag d'affinité vert émeraude */}
                      <div className="inline-flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded text-[9.5px] font-bold text-emerald-800 max-w-full truncate mb-1">
                        <Compass size={10} className="shrink-0 text-emerald-600" />
                        <span className="truncate">{affinityLabel}</span>
                      </div>

                      <Link
                        to={getListingPath(item.id, item.title)}
                        className="block text-xs font-semibold text-gray-800 hover:text-emerald-700 line-clamp-2 leading-snug"
                      >
                        {item.title}
                      </Link>
                    </div>

                    <div className="flex items-end justify-between gap-1 pt-1 border-t border-gray-100/80 mt-1">
                      <div>
                        <span className="font-mono tabular-nums font-black text-xs text-emerald-700">
                          {formatPrice(item.price)}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <MapPin size={9} className="shrink-0" />
                          <span className="truncate max-w-[80px]">{item.district || 'Daloa'}</span>
                        </div>
                      </div>

                      <Link
                        to={getListingPath(item.id, item.title)}
                        className="text-[10px] font-bold text-emerald-700 hover:underline shrink-0"
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
      </div>
    </section>
  );
};
