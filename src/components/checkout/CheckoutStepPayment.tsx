import React from 'react';
import { motion } from 'framer-motion';
import { Truck, Shield, CreditCard, Info, AlertTriangle, Gift } from 'lucide-react';
import { isCurfewActive } from '../../utils/timeConstraints';
import { formatPrice } from '../../lib/utils';
import {
  BUYER_FEE_RATE,
  DELIVERY_MIN,
  DELIVERY_RATE_PER_KM,
  DELIVERY_FREE_KM,
} from '../../lib/pricing';
import { Button } from '../ui/Button';
import { PromoCodeInputBox, type AppliedPromoCode } from './PromoCodeInputBox';
import { CheckoutPaymentMethods } from './CheckoutPaymentMethods';
import type { CheckoutPaymentMethod, CheckoutTotals, QuoteStatus } from './checkout.types';

interface CheckoutStepPaymentProps {
  summary: {
    isCartMode: boolean;
    itemCount: number;
    distanceKm: number;
    totals: CheckoutTotals;
  };
  paymentState: {
    paymentMethod: CheckoutPaymentMethod;
    onlineDisabled: boolean;
    paymentNotice?: string | null;
    isPickupAllowed: boolean;
    isCodAllowed: boolean;
    isCodBlocked: boolean;
    codBlockedFormattedDate: string;
    isSelfCheckout: boolean;
    quoteStatus: QuoteStatus;
    paying: boolean;
    appliedPromo: AppliedPromoCode | null;
  };
  actions: {
    onSelectPaymentMethod: (method: CheckoutPaymentMethod) => void;
    onApplyPromo: (promo: AppliedPromoCode | null) => void;
    onBack: () => void;
    onPay: () => void;
  };
}

/**
 * Étape de règlement Web : choix du mode de paiement en premier avec frais annoncés
 * à l'avance, suivi d'un récapitulatif stable sans ligne qui surgit par surprise.
 */
export const CheckoutStepPayment: React.FC<CheckoutStepPaymentProps> = ({
  summary,
  paymentState,
  actions,
}) => {
  const { totals, isCartMode, itemCount, distanceKm } = summary;
  const {
    paymentMethod,
    onlineDisabled,
    paymentNotice,
    isPickupAllowed,
    isCodAllowed,
    isCodBlocked,
    codBlockedFormattedDate,
    isSelfCheckout,
    quoteStatus,
    paying,
    appliedPromo,
  } = paymentState;

  const estimatedOnlineFee = Math.round(totals.productAmount * BUYER_FEE_RATE);

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-4"
    >
      <CheckoutPaymentMethods
        config={{
          paymentMethod,
          onlineDisabled,
          paymentNotice,
          isPickup: totals.isPickup,
          isPickupAllowed,
          isCodAllowed,
          isCodBlocked,
          codBlockedFormattedDate,
          estimatedOnlineFee,
        }}
        onSelect={actions.onSelectPaymentMethod}
      />

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="flex items-center gap-2 border-b border-stone-200 bg-stone-50 px-4 py-3">
          <CreditCard className="h-4 w-4 text-[var(--color-primary)]" />
          <span className="text-sm font-bold text-stone-900">Récapitulatif</span>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between font-medium text-stone-600">
              <span>{isCartMode ? `Articles (${itemCount})` : 'Prix article'}</span>
              <span className="font-bold tabular-nums text-stone-900">
                {formatPrice(totals.productAmount)}
              </span>
            </div>

            <div className="flex items-center justify-between font-medium text-stone-600">
              <div className="flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-stone-400" />
                <span>
                  {totals.isPickup
                    ? 'Retrait en boutique'
                    : distanceKm > 0
                      ? `Livraison (${distanceKm} km)`
                      : 'Livraison'}
                </span>
                {!totals.isPickup && (
                  <span className="group relative cursor-help">
                    <Info className="h-3.5 w-3.5 text-stone-400 opacity-80" />
                    <span className="pointer-events-none invisible absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-lg bg-stone-900 p-2.5 text-[11px] leading-relaxed text-white opacity-0 transition-opacity group-hover:visible group-hover:opacity-100">
                      Livraison : {formatPrice(totals.deliveryFee)} (base {DELIVERY_MIN} FCFA, puis{' '}
                      {DELIVERY_RATE_PER_KM} FCFA/km au-delà de {DELIVERY_FREE_KM} km
                      {distanceKm > 0 ? ` × ${distanceKm} km` : ''})
                    </span>
                  </span>
                )}
              </div>
              <span className="font-bold tabular-nums text-stone-900">
                {totals.isPickup ? 'Gratuit (0 FCFA)' : formatPrice(totals.deliveryFee)}
              </span>
            </div>

            {!totals.isPickup && (
              <div className="flex items-center justify-between font-medium text-stone-600">
                <span>
                  Frais paiement en ligne ({Math.round(BUYER_FEE_RATE * 100)} %)
                </span>
                {totals.isCashPayment ? (
                  <span className="font-semibold tabular-nums text-emerald-700">0 FCFA</span>
                ) : (
                  <span className="font-bold tabular-nums text-stone-900">
                    {formatPrice(totals.buyerFee)}
                  </span>
                )}
              </div>
            )}

            {totals.isGroupedDelivery && totals.groupedDeliverySavings > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-medium text-emerald-800">
                <div className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="font-semibold">Économie livraison groupée</span>
                </div>
                <span className="font-bold tabular-nums">-{formatPrice(totals.groupedDeliverySavings)}</span>
              </div>
            )}

            {totals.applicableDaloaCash > 0 && appliedPromo && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-medium text-emerald-800">
                <div className="flex items-center gap-1.5">
                  <Gift className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="font-semibold">Code promo ({appliedPromo.code})</span>
                </div>
                <span className="font-bold tabular-nums">-{formatPrice(totals.applicableDaloaCash)}</span>
              </div>
            )}
          </div>

          <PromoCodeInputBox
            orderSubtotal={totals.productAmount}
            paymentMethod={paymentMethod}
            appliedPromo={appliedPromo}
            onApplyPromo={actions.onApplyPromo}
          />

          <div className="h-px bg-stone-200" />

          <div className="flex items-end justify-between pt-1">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                TOTAL À PAYER
              </span>
              <span className="text-[11px] font-medium text-stone-400">
                {totals.isCashPayment ? 'À régler en main propre' : 'Tout compris'}
              </span>
            </div>
            <span className="text-2xl font-extrabold tabular-nums text-[var(--color-primary)]">
              {formatPrice(totals.total)}
            </span>
          </div>
        </div>
      </div>

      {isCurfewActive() && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-amber-900">Courses nocturnes suspendues (22h30 - 05h30)</p>
            <p className="text-xs leading-relaxed text-amber-800">
              Pour la sécurité des livreurs, les livraisons reprendront demain matin dès 05h30.
            </p>
          </div>
        </div>
      )}

      {isSelfCheckout && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
          <Shield className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>Vous ne pouvez pas commander vos propres articles.</p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Button variant="outlined" color="secondary" size="md" onClick={actions.onBack} className="shrink-0 rounded-xl px-5 font-semibold">
          ← Retour
        </Button>
        <Button
          variant="filled"
          color="primary"
          size="md"
          loading={paying || quoteStatus === 'loading'}
          disabled={isSelfCheckout || quoteStatus === 'loading' || (paymentMethod === 'online' && onlineDisabled)}
          icon={<CreditCard className="h-4 w-4" />}
          onClick={actions.onPay}
          className="flex-1 whitespace-nowrap rounded-xl font-bold"
        >
          {quoteStatus === 'loading'
            ? 'Calcul du prix…'
            : quoteStatus === 'error'
              ? 'Recalculer le prix'
              : totals.paymentActionLabel}
        </Button>
      </div>
    </motion.div>
  );
};
