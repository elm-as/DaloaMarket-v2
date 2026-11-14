import React from 'react';
import { Percent, ShieldCheck, Crown } from 'lucide-react';
import type { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';
import type { ListingFormValues } from '../../../pages/ListingCreatePage';
import { formatPrice } from '../../../lib/utils';
import { ListingVariantsSection } from './ListingVariantsSection';
import type { ListingVariant } from '../../../types/listing';

interface ListingPricingSectionProps {
  register: UseFormRegister<ListingFormValues>;
  errors: FieldErrors<ListingFormValues>;
  setValue?: UseFormSetValue<ListingFormValues>;
  category?: string;
  priceNum: number;
  discountPercent: number;
  sellerFee: number;
  netPayout: number;
  sellerFeeRate?: number;
  isPro?: boolean;
  variants: ListingVariant[];
  onVariantsChange: (variants: ListingVariant[]) => void;
}

export const ListingPricingSection: React.FC<ListingPricingSectionProps> = ({
  register,
  errors,
  category,
  priceNum,
  discountPercent,
  sellerFee,
  netPayout,
  sellerFeeRate = 0,
  isPro = false,
  variants,
  onVariantsChange,
}) => {
  return (
    <div className="space-y-4">
      {/* ── 2-COLUMN PRICE GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Prix de vente */}
        <div>
          <div className="flex items-center justify-between mb-1.5 pl-1">
            <label className="text-xs font-bold text-gray-800">
              Prix de vente <span className="text-red-500">*</span>
            </label>
            {!isNaN(priceNum) && priceNum > 0 && (
              <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100">
                {formatPrice(priceNum)}
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              {...register('price', { required: 'Le prix est requis', min: { value: 300, message: 'Minimum 300 FCFA' } })}
              placeholder="0"
              className="w-full h-11 pl-3.5 pr-14 rounded-2xl border border-gray-200 bg-orange-50/20 text-base font-extrabold placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-gray-900 shadow-2xs"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-orange-600">FCFA</span>
          </div>
          {errors.price && <p className="text-xs text-red-500 mt-1 ml-1 font-semibold">{errors.price.message}</p>}
        </div>

        {/* Prix d'origine (Promo) */}
        <div>
          <div className="flex items-center justify-between mb-1.5 pl-1">
            <label className="text-xs font-bold text-gray-800">
              Prix d'origine <span className="text-[10px] text-gray-400 font-normal">(Optionnel)</span>
            </label>
            {discountPercent > 0 && (
              <span className="bg-red-100 text-red-600 text-[10px] font-extrabold px-2 py-0.5 rounded-lg flex items-center gap-0.5 animate-pulse">
                <Percent className="w-2.5 h-2.5" />
                -{discountPercent}%
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              {...register('original_price', { min: { value: 0, message: 'Minimum 0 FCFA' } })}
              placeholder="Ex: 15 000"
              className="w-full h-11 pl-3.5 pr-14 rounded-2xl border border-gray-200 bg-gray-50/70 text-sm font-medium placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-gray-900 shadow-2xs"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">FCFA</span>
          </div>
          {errors.original_price && <p className="text-xs text-red-500 mt-1 ml-1 font-semibold">{errors.original_price.message}</p>}
        </div>
      </div>

      {/* ── SIMULATEUR DE GAIN VENDEUR EN DIRECT (TOUJOURS VISIBLE DÈS SAISIE) ── */}
      {!isNaN(priceNum) && priceNum >= 300 && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-teal-50/60 to-white border border-emerald-200/80 text-xs space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-extrabold text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Simulation de votre revenu en direct
            </span>
            {isPro ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                <Crown className="w-3 h-3" /> Tarif PRO (2,5%)
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-700">
                Paiement Mobile Money garanti
              </span>
            )}
          </div>

          <div className="flex justify-between items-center text-gray-600 font-medium pt-1">
            <span>Prix affiché à l'acheteur</span>
            <span className="font-bold text-gray-900 tabular-nums">{formatPrice(priceNum)}</span>
          </div>

          <div className="flex justify-between items-center text-gray-600 font-medium">
            <span>
              Commission DaloaMarket ({(sellerFeeRate * 100).toFixed(1).replace('.0', '')}%)
            </span>
            <span className="text-red-500 font-bold tabular-nums">
              {sellerFee > 0 ? `-${formatPrice(sellerFee)}` : '0 FCFA (Offert)'}
            </span>
          </div>

          <div className="flex justify-between items-center text-gray-900 font-bold pt-2 border-t border-emerald-200/70">
            <span className="text-xs font-extrabold text-emerald-950">
              💰 Ce que vous touchez réellement
            </span>
            <span className="text-emerald-700 font-black text-base tabular-nums">
              {formatPrice(netPayout)}
            </span>
          </div>

          {!isPro && sellerFeeRate > 0.025 && priceNum >= 2000 && (
            <p className="text-[11px] text-amber-800 bg-amber-50/90 border border-amber-200/60 rounded-xl px-2.5 py-1.5 font-semibold">
              💡 Avec le <strong>Pack Vendeur PRO</strong> (commission réduite à 2,5%), vous toucheriez{' '}
              <strong className="tabular-nums">{formatPrice(priceNum - Math.round(priceNum * 0.025))}</strong> sur cette vente.
            </p>
          )}
        </div>
      )}

      {/* ── QUANTITÉ / STOCK (SI PAS DE VARIANTES) ── */}
      {variants.length === 0 && (
        <div>
          <label className="block text-xs font-bold text-gray-800 mb-1.5 pl-1">
            Quantité en stock <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              {...register('stock', { required: 'La quantité est requise', min: { value: 1, message: 'Minimum 1' } })}
              placeholder="1"
              className="w-full h-11 pl-3.5 pr-16 rounded-2xl border border-gray-200 bg-gray-50/70 text-sm font-semibold placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-gray-900 shadow-2xs"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">unités</span>
          </div>
          {errors.stock && <p className="text-xs text-red-500 mt-1 ml-1 font-semibold">{errors.stock.message}</p>}
        </div>
      )}

      {/* ── VARIANTS COMPONENT (COULEURS, TAILLES, POINTURES) ── */}
      <ListingVariantsSection variants={variants} category={category} onChange={onVariantsChange} />
    </div>
  );
};

export default ListingPricingSection;
