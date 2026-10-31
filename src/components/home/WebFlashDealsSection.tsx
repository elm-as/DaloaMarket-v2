import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Clock, Rocket, MapPin } from 'lucide-react';
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

function computeSecondsToMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(23, 59, 59, 999);
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

function formatCountdown(totalSeconds: number): string {
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}h : ${minutes}m : ${seconds}s`;
}

export const WebFlashDealsSection: React.FC = () => {
  const navigate = useNavigate();
  const { enableBoost } = usePhase();
  const [deals, setDeals] = useState<FlashDealItem[]>([]);
  const [secondsLeft, setSecondsLeft] = useState<number>(computeSecondsToMidnight);

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

      if (!error && data && data.length > 0) {
        setDeals(data as FlashDealItem[]);
        return;
      }

      const { data: fallback } = await supabase
        .from('listings')
        .select('id, title, price, original_price, photos, district, stock, boosted_until')
        .eq('status', 'active')
        .not('photos', 'eq', '{}')
        .order('created_at', { ascending: false })
        .limit(8);

      if (fallback) {
        setDeals(fallback as FlashDealItem[]);
      }
    } catch {
      // Échec silencieux
    }
  }, []);

  useEffect(() => {
    fetchFlashDeals();
  }, [fetchFlashDeals]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(computeSecondsToMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (deals.length === 0) return null;

  return (
    <section id="flash-deals-section" className="px-4 pt-3 pb-1">
      <div className="mx-auto max-w-2xl lg:max-w-5xl rounded-3xl border border-orange-100 bg-white overflow-hidden shadow-sm">
        {/* Bandeau supérieur Rouge/Orange façon Jumia */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 px-4 py-2.5 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-300 text-red-600 shadow-xs">
              <Zap className="h-4 w-4 fill-red-600" />
            </span>
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wide text-white leading-tight">
                Ventes Flash & Promos Daloa
              </h2>
              <p className="flex items-center gap-1 text-[11px] font-extrabold text-yellow-200 tabular-nums">
                <Clock className="h-3 w-3" />
                <span>Termine dans : {formatCountdown(secondsLeft)}</span>
              </p>
            </div>
          </div>

          {enableBoost && (
            <button
              type="button"
              onClick={() => navigate('/acheter-pack')}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-red-600 shadow-xs hover:bg-orange-50 transition-colors"
            >
              <Rocket className="h-3.5 w-3.5" />
              <span>Booster un article</span>
            </button>
          )}
        </div>

        {/* Carrousel horizontal de cartes Flash */}
        <div className="no-scrollbar flex items-stretch gap-3 overflow-x-auto p-3.5">
          {deals.map((item) => {
            const photo = item.photos?.[0] || '';
            const hasDiscount = item.original_price != null && item.original_price > item.price;
            const discountPercent = hasDiscount
              ? Math.min(90, Math.max(5, Math.round(((item.original_price! - item.price) / item.original_price!) * 100)))
              : null;
            const stock = Math.max(1, Number(item.stock ?? 1));
            const stockRatio = stock === 1 ? 88 : stock <= 3 ? 72 : 45;
            const stockLabel = stock === 1 ? 'Dernière pièce !' : `Plus que ${stock} dispo`;

            return (
              <button
                key={`web-flash-${item.id}`}
                type="button"
                onClick={() => navigate(`/listings/${item.id}`)}
                className="group flex w-40 sm:w-44 shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white text-left transition-all hover:border-orange-200 hover:shadow-md"
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
                    <span className="absolute right-2 top-2 rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-black text-red-600 tabular-nums shadow-2xs">
                      -{discountPercent}%
                    </span>
                  ) : (
                    <span className="absolute left-2 top-2 rounded-md bg-orange-600 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-2xs">
                      VEDETTE
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between p-2.5 gap-1.5">
                  <div>
                    <p className="line-clamp-1 text-xs font-bold text-gray-900 group-hover:text-orange-600">
                      {item.title}
                    </p>
                    <div className="mt-1 flex items-baseline gap-1.5 tabular-nums">
                      <span className="text-sm font-black text-red-600">
                        {formatPrice(item.price)} F
                      </span>
                      {hasDiscount && (
                        <span className="text-[10px] font-semibold text-gray-400 line-through">
                          {formatPrice(item.original_price!)} F
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Jauge de stock façon Jumia */}
                  <div className="space-y-1">
                    <div className="relative h-4 w-full overflow-hidden rounded-full bg-orange-100">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red-600 to-orange-500"
                        style={{ width: `${stockRatio}%` }}
                      />
                      <span className="relative z-10 block text-center text-[9.5px] font-extrabold leading-4 text-white drop-shadow-2xs tabular-nums">
                        {stockLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <MapPin className="h-3 w-3 shrink-0 text-gray-400" />
                      <span className="truncate">{item.district || 'Daloa'}</span>
                    </div>
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

