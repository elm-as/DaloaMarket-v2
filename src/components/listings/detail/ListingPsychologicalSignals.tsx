import React from 'react';
import { PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import { formatPrice } from '../../../lib/utils';

interface ListingPsychologicalSignalsProps {
  listingId: string;
  stock: number;
  currentPrice: number;
  originalPrice?: number | null;
}

/**
 * Indicateurs factuels de disponibilité et garanties transactionnelles
 * affichés sur la fiche produit.
 */
export const ListingPsychologicalSignals: React.FC<ListingPsychologicalSignalsProps> = ({
  stock,
  currentPrice,
  originalPrice,
}) => {
  const effectiveStock = Math.max(0, stock);
  const isLowStock = effectiveStock > 0 && effectiveStock <= 3;
  const savingsAmount =
    originalPrice != null && originalPrice > currentPrice
      ? originalPrice - currentPrice
      : 0;

  return (
    <div className="space-y-2.5 pt-2">
      {(isLowStock || savingsAmount > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {isLowStock && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1 text-xs font-semibold text-amber-900 tabular-nums font-mono">
              <PackageCheck className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              <span>
                Stock restant : {effectiveStock} unité{effectiveStock > 1 ? 's' : ''}
              </span>
            </span>
          )}

          {savingsAmount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-xs font-semibold text-emerald-900 tabular-nums font-mono">
              <span>Remise immédiate : -{formatPrice(savingsAmount)} F</span>
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
        <div className="flex items-start gap-2.5 rounded-xl border border-gray-200/80 bg-gray-50/70 p-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 leading-tight">
              Paiement protégé par code OTP
            </p>
            <p className="text-[11px] text-gray-600 leading-snug mt-0.5">
              Fonds conservés jusqu’à la remise de l’article. Remboursement en cas de non-conformité.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-gray-200/80 bg-gray-50/70 p-3">
          <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-700 border border-orange-200/70 flex items-center justify-center shrink-0 mt-0.5">
            <Truck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 leading-tight">
              Livraison locale à Daloa
            </p>
            <p className="text-[11px] text-gray-600 leading-snug mt-0.5">
              Prise en charge en boutique et livraison à domicile par un coursier DaloaDelivery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingPsychologicalSignals;
