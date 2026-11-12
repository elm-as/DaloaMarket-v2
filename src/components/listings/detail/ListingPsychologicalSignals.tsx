import React, { useEffect, useState } from 'react';
import { Flame, Eye, Heart, ShieldCheck, Truck, Sparkles } from 'lucide-react';
import { fetchListingEngagementSignals, type ListingEngagementSignals } from '../../../lib/engagementSignals';
import { formatPrice } from '../../../lib/utils';

interface ListingPsychologicalSignalsProps {
  listingId: string;
  stock: number;
  currentPrice: number;
  originalPrice?: number | null;
}

/**
 * Bloc de signaux psychologiques basés sur les données réelles :
 * - FOMO (stock limité, visiteurs réels 7j, favoris, économie immédiate)
 * - Confiance (Garantie Satisfait ou Remboursé avec séquestre OTP)
 * - Gratification immédiate (Livraison express le jour même à Daloa)
 */
export const ListingPsychologicalSignals: React.FC<ListingPsychologicalSignalsProps> = ({
  listingId,
  stock,
  currentPrice,
  originalPrice,
}) => {
  const [signals, setSignals] = useState<ListingEngagementSignals | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchListingEngagementSignals(listingId).then((res) => {
      if (mounted) setSignals(res);
    });
    return () => {
      mounted = false;
    };
  }, [listingId]);

  const effectiveStock = Math.max(0, stock);
  const isLowStock = effectiveStock > 0 && effectiveStock <= 3;
  const savingsAmount =
    originalPrice != null && originalPrice > currentPrice
      ? originalPrice - currentPrice
      : signals?.priceDropAmount || 0;
  const recentViewers = signals?.recentViewers7d || 0;
  const favoritesCount = signals?.favoritesCount || 0;

  return (
    <div className="space-y-2.5 pt-2">
      {/* ── Signaux FOMO dynamiques (100% basés sur les vraies données) ── */}
      {(isLowStock || savingsAmount > 0 || recentViewers >= 2 || favoritesCount >= 1) && (
        <div className="flex flex-wrap gap-1.5">
          {isLowStock && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 px-2.5 py-1 text-[11px] font-extrabold text-red-700 tabular-nums">
              <Flame className="w-3.5 h-3.5 text-red-600 fill-red-500 shrink-0" />
              Plus que {effectiveStock} en stock à ce prix !
            </span>
          )}

          {savingsAmount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 tabular-nums">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Vous économisez {formatPrice(savingsAmount)}
            </span>
          )}

          {recentViewers >= 2 && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-orange-50 border border-orange-200/80 px-2.5 py-1 text-[11px] font-bold text-orange-900 tabular-nums">
              <Eye className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              {recentViewers} personnes ont regardé cet article cette semaine
            </span>
          )}

          {favoritesCount >= 1 && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200/80 px-2.5 py-1 text-[11px] font-bold text-rose-800 tabular-nums">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
              Dans les favoris de {favoritesCount} acheteur{favoritesCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* ── Confiance (Satisfait ou Remboursé) & Gratification immédiate (Rapidité) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        <div className="flex items-start gap-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 p-3">
          <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-emerald-950 leading-tight">
              Satisfait ou remboursé
            </p>
            <p className="text-[11px] text-emerald-800 leading-snug mt-0.5">
              Argent protégé par code secret jusqu'à la remise. Remboursé si non livré ou non conforme.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 p-3">
          <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 mt-0.5">
            <Truck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-gray-900 leading-tight">
              Livraison express à Daloa
            </p>
            <p className="text-[11px] text-gray-600 leading-snug mt-0.5">
              Un coursier DaloaDelivery récupère votre colis et vous livre chez vous le jour même.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingPsychologicalSignals;

