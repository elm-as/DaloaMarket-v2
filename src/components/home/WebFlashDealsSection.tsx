import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Rocket, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';
import { usePhase } from '../../contexts/PhaseContext';

interface FlashDealItem {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  photos: string[] | null;
  district: string | null;
  stock: number | null;
  boosted_until: string | null;
}

export const WebFlashDealsSection: React.FC = () => {
  const navigate = useNavigate();
  const { enableBoost } = usePhase();
  const [deals, setDeals] = useState<FlashDealItem[]>([]);

  const fetchFlashDeals = useCallback(async () => {
    const nowIso = new Date().toISOString();
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, price, original_price, photos, district, stock, boosted_until')
        .eq('status', 'active')
        .not('photos', 'eq', '{}')
        .or(`boosted_until.gt.${nowIso},original_price.gt.0`)
        .order('boosted_until', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(8);

      if (!error && data) {
        const realPromos = (data as FlashDealItem[]).filter(
          (item) =>
            (item.boosted_until && item.boosted_until > nowIso) ||
            (item.original_price != null && item.original_price > item.price)
        );
        setDeals(realPromos);
      }
    } catch (err) {
      console.warn('WebFlashDealsSection load warning:', err);
    }
  }, []);

  useEffect(() => {
    void fetchFlashDeals();
  }, [fetchFlashDeals]);

  if (deals.length === 0) return null;

  return (
    <section id="flash-deals-section" className="px-4 pt-3 pb-1">
      <div className="mx-auto max-w-2xl lg:max-w-5xl rounded-2xl border border-gray-200/80 bg-white overflow-hidden shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/70 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
              <Tag className="h-3.5 w-3.5" />
            </span>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                Promotions & Articles en vedette
              </h2>
              <p className="text-[11px] font-medium text-gray-500">
                Sélection d’offres actives proposées par les vendeurs de Daloa
              </p>
            </div>
          </div>

          {enableBoost && (
            <button
              type="button"
              onClick={() => navigate('/acheter-pack')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 hover:bg-orange-100 transition-colors"
            >
              <Rocket className="h-3.5 w-3.5" />
              <span>Mettre en avant</span>
            </button>
          )}
        </div>

        <div className="no-scrollbar flex items-stretch gap-3 overflow-x-auto p-3.5">
          {deals.map((item) => {
            const photo = item.photos?.[0] || '';
            const hasDiscount = item.original_price != null && item.original_price > item.price;
            const discountPercent = hasDiscount
              ? Math.min(90, Math.max(5, Math.round(((item.original_price! - item.price) / item.original_price!) * 100)))
              : null;

            return (
              <button
                key={`web-flash-${item.id}`}
                type="button"
                onClick={() => navigate(`/listings/${item.id}`)}
                className="group flex w-40 sm:w-44 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white text-left transition-all hover:border-orange-300 hover:shadow-xs"
              >
                <div className="relative h-32 w-full overflow-hidden bg-gray-100">
                  {photo ? (
                    <img
                      src={photo}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : null}

                  {discountPercent ? (
                    <span className="absolute right-2 top-2 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 tabular-nums font-mono">
                      -{discountPercent}%
                    </span>
                  ) : (
                    <span className="absolute left-2 top-2 rounded-md bg-gray-900/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                      Vedette
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between p-2.5 gap-1.5">
                  <div>
                    <p className="line-clamp-1 text-xs font-semibold text-gray-900 group-hover:text-orange-600">
                      {item.title}
                    </p>
                    <div className="mt-1 flex items-baseline gap-1.5 tabular-nums font-mono">
                      <span className="text-sm font-bold text-gray-900">
                        {formatPrice(item.price)} F
                      </span>
                      {hasDiscount && (
                        <span className="text-[10px] font-medium text-gray-400 line-through">
                          {formatPrice(item.original_price!)} F
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <MapPin className="h-3 w-3 shrink-0 text-gray-400" />
                    <span className="truncate">{item.district || 'Daloa'}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
