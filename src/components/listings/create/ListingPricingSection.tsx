import React from 'react';
import { Percent, Sparkles, CheckCircle2 } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { ListingFormValues } from '../../../pages/ListingCreatePage';
import { formatPrice } from '../../../lib/utils';
import { ListingVariantsSection } from './ListingVariantsSection';
import type { ListingVariant } from '../../../types/listing';

interface ListingPricingSectionProps {
  register: UseFormRegister<ListingFormValues>;
  errors: FieldErrors<ListingFormValues>;
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

      {/* ── SIMULATEUR DE COMMISSION (UNIQUEMENT SI COMMISSION > 0) ── */}
      {sellerFeeRate > 0 && !isNaN(priceNum) && priceNum > 0 && (
        <div className="p-3.5 rounded-2xl bg-orange-50/40 border border-orange-100 text-xs space-y-2">
          <div className="flex justify-between items-center text-gray-600 font-medium">
            <span>Frais de service ({(sellerFeeRate * 100).toFixed(0)}%)</span>
            <span className="text-red-500 font-bold">-{formatPrice(sellerFee)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-900 font-bold pt-2 border-t border-orange-150/60">
            <span>Votre gain net reversé</span>
            <span className="text-orange-600 font-black text-sm">{formatPrice(netPayout)}</span>
          </div>
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
      <ListingVariantsSection variants={variants} onChange={onVariantsChange} />
    </div>
  );
};

export default ListingPricingSection;
