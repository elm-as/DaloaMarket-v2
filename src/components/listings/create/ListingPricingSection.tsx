import React from 'react';
import { Wallet, Percent, ClipboardCheck, Layers } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Card } from '../../ui/Card';
import type { ListingFormValues } from '../../../pages/ListingCreatePage';
import { formatPrice } from '../../../lib/utils';
import { SELLER_FEE_RATE } from '../../../lib/pricing';

interface ListingPricingSectionProps {
  register: UseFormRegister<ListingFormValues>;
  errors: FieldErrors<ListingFormValues>;
  priceNum: number;
  discountPercent: number;
  sellerFee: number;
  netPayout: number;
  isPro?: boolean;
}

export const ListingPricingSection: React.FC<ListingPricingSectionProps> = ({
  register,
  errors,
  priceNum,
  discountPercent,
  sellerFee,
  netPayout,
  isPro = false,
}) => {
  const currentSellerFeeRate = isPro ? 0.025 : SELLER_FEE_RATE;
  return (
    <div className="space-y-4">
      {/* SECTION HEADER */}
      <div className="flex items-center gap-2.5 px-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
          <Wallet className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">Tarification & Stock</h2>
          <p className="text-[11px] text-gray-500">Définissez votre prix et gérez la quantité</p>
        </div>
      </div>

      <Card elevation={1} padding="md" className="rounded-2xl space-y-4 border border-gray-100">
        {/* PRIX DE VENTE */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Prix de vente <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              {...register('price', { required: 'Le prix est requis', min: { value: 300, message: 'Minimum 300 FCFA' } })}
              placeholder="0"
              className="w-full h-12 pl-4 pr-16 rounded-xl border-2 border-orange-100 bg-orange-50/5 text-base font-bold placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#FF7F00] transition-all text-gray-900"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-orange-600">FCFA</span>
          </div>
          {errors.price && <p className="text-xs text-red-500 mt-1 ml-1 font-semibold">{errors.price.message}</p>}
        </div>

        {/* PRIX ORIGINAL */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Prix d'origine (avant réduction)
          </label>
          <div className="relative">
            <input
              type="number"
              {...register('original_price', { min: { value: 0, message: 'Minimum 0 FCFA' } })}
              placeholder="Ex: 15000"
              className="w-full h-12 pl-4 pr-24 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-[#FF7F00] transition-all text-gray-900"
            />
            {discountPercent > 0 && (
              <div className="absolute right-16 top-1/2 -translate-y-1/2 bg-red-100 text-red-600 text-[10px] font-extrabold px-2 py-0.5 rounded-lg flex items-center gap-0.5 animate-pulse">
                <Percent className="w-2.5 h-2.5" />
                -{discountPercent}%
              </div>
            )}
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">FCFA</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
            Si le prix d'origine est plus élevé que le prix de vente, un badge de promotion s'affichera sur votre annonce.
          </p>
          {errors.original_price && <p className="text-xs text-red-500 mt-1 ml-1 font-semibold">{errors.original_price.message}</p>}
        </div>

        {/* QUANTITÉ / STOCK */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Quantité en stock <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              {...register('stock', { required: 'La quantité est requise', min: { value: 1, message: 'Minimum 1' } })}
              placeholder="1"
              className="w-full h-12 pl-4 pr-16 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-[#FF7F00] transition-all text-gray-900"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">unités</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            Laissez à 1 s'il s'agit d'un article unique ou d'occasion.
          </p>
          {errors.stock && <p className="text-xs text-red-500 mt-1 ml-1 font-semibold">{errors.stock.message}</p>}
        </div>

        {/* SIMULATEUR DE REVENUS */}
        <div className="pt-2">
          <div className="bg-gradient-to-r from-gray-50 to-orange-50/20 rounded-2xl p-4 border border-gray-200/60 shadow-inner space-y-3">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4 text-[#FF7F00]" />
              Simulateur de revenus (DaloaMarket)
            </h3>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-gray-600">
                <span>Prix de vente</span>
                <span className="font-bold text-gray-900">{!isNaN(priceNum) && priceNum > 0 ? formatPrice(priceNum) : '0 FCFA'}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Commission service ({(currentSellerFeeRate * 100).toFixed(1)}%)</span>
                <span className="font-bold text-red-500">-{!isNaN(sellerFee) && sellerFee > 0 ? formatPrice(sellerFee) : '0 FCFA'}</span>
              </div>
              
              <div className="h-px bg-dashed bg-gray-200 my-2" />
              
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800">Votre gain net</span>
                <span className="font-black text-[#FF7F00] text-sm bg-orange-100/50 px-2 py-0.5 rounded-lg">
                  {!isNaN(netPayout) && netPayout > 0 ? formatPrice(netPayout) : '0 FCFA'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
