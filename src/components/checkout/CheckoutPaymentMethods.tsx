import React from 'react';
import { Truck, CreditCard, Banknote, Store } from 'lucide-react';
import { cn, formatPrice } from '../../lib/utils';
import { BUYER_FEE_RATE } from '../../lib/pricing';
import type { CheckoutPaymentMethod } from './checkout.types';

interface CheckoutPaymentMethodsProps {
  config: {
    paymentMethod: CheckoutPaymentMethod;
    onlineDisabled: boolean;
    paymentNotice?: string | null;
    isPickup: boolean;
    isPickupAllowed: boolean;
    isCodAllowed: boolean;
    isCodBlocked: boolean;
    codBlockedFormattedDate: string;
    estimatedOnlineFee?: number;
  };
  onSelect: (method: CheckoutPaymentMethod) => void;
}

/**
 * Sélecteur de mode de règlement au checkout Web.
 * Annonce les frais éventuels directement sur chaque carte afin d'éviter toute hausse surprise.
 */
export const CheckoutPaymentMethods: React.FC<CheckoutPaymentMethodsProps> = ({
  config,
  onSelect,
}) => {
  const {
    paymentMethod,
    onlineDisabled,
    paymentNotice,
    isPickup,
    isPickupAllowed,
    isCodAllowed,
    isCodBlocked,
    codBlockedFormattedDate,
    estimatedOnlineFee = 0,
  } = config;

  const isDeliveryMode = !isPickup;
  const hasMultipleChoices = isPickupAllowed || isCodAllowed || isCodBlocked;
  const feePercentLabel = `${Math.round(BUYER_FEE_RATE * 100)} %`;
  const onlineFeeHint =
    estimatedOnlineFee > 0
      ? `Frais de service en ligne : +${formatPrice(estimatedOnlineFee)} (${feePercentLabel})`
      : `Frais de service en ligne : ${feePercentLabel}`;

  return (
    <div className="space-y-3.5 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 text-sm font-bold text-stone-900">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-[var(--color-primary)]" />
          <span>Mode de paiement</span>
        </div>
      </div>

      <div className={cn('grid gap-3', hasMultipleChoices ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
        {isDeliveryMode && isCodBlocked && (
          <div className="flex flex-col justify-between rounded-xl border-2 border-red-200 bg-red-50/70 p-4 text-left">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-red-900">
                <Banknote className="h-4 w-4 shrink-0 text-red-600" />
                <span>Paiement à la livraison</span>
              </span>
              <span className="rounded bg-red-200 px-2 py-0.5 text-[10px] font-bold uppercase text-red-800">
                Suspendu
              </span>
            </div>
            <p className="mt-2 text-[11px] font-medium leading-relaxed text-red-700">
              Suspendu jusqu&apos;au {codBlockedFormattedDate} suite à des commandes non réceptionnées.
            </p>
          </div>
        )}

        {isDeliveryMode && !isCodBlocked && isCodAllowed && (
          <button
            type="button"
            onClick={() => onSelect('cod')}
            className={cn(
              'flex flex-col justify-between rounded-xl border-2 p-4 text-left transition-colors',
              paymentMethod === 'cod'
                ? 'border-[var(--color-primary)] bg-orange-50/40 text-stone-900'
                : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold">
                <Banknote className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Paiement à la livraison</span>
              </span>
              <div
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                  paymentMethod === 'cod'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                    : 'border-stone-300'
                )}
              >
                {paymentMethod === 'cod' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <span className="mt-2 text-[11px] font-medium text-stone-600">
              Espèces ou Mobile Money au livreur
            </span>
            <span className="mt-1 text-[11px] font-semibold text-emerald-700">
              0 FCFA de frais en ligne
            </span>
          </button>
        )}

        {isPickupAllowed && isPickup && (
          <button
            type="button"
            onClick={() => onSelect('cash_at_shop')}
            className={cn(
              'flex flex-col justify-between rounded-xl border-2 p-4 text-left transition-colors',
              paymentMethod === 'cash_at_shop'
                ? 'border-[var(--color-primary)] bg-orange-50/40 text-stone-900'
                : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold">
                <Store className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Espèces au magasin</span>
              </span>
              <div
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                  paymentMethod === 'cash_at_shop'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                    : 'border-stone-300'
                )}
              >
                {paymentMethod === 'cash_at_shop' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <span className="mt-2 text-[11px] font-medium text-stone-600">
              Payer directement au vendeur sur place
            </span>
            <span className="mt-1 text-[11px] font-semibold text-emerald-700">
              0 FCFA de frais en ligne
            </span>
          </button>
        )}

        <button
          type="button"
          disabled={onlineDisabled}
          onClick={() => !onlineDisabled && onSelect('online')}
          className={cn(
            'flex flex-col justify-between rounded-xl border-2 p-4 text-left transition-colors',
            onlineDisabled
              ? 'cursor-not-allowed border-stone-200 bg-stone-50 text-stone-400 opacity-60'
              : paymentMethod === 'online'
                ? 'border-[var(--color-primary)] bg-orange-50/40 text-stone-900'
                : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold">
              <CreditCard
                className={cn(
                  'h-4 w-4 shrink-0',
                  onlineDisabled ? 'text-stone-400' : 'text-[var(--color-primary)]'
                )}
              />
              <span>Mobile Money en ligne</span>
              {onlineDisabled && (
                <span className="ml-1 rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-stone-700">
                  Indisponible
                </span>
              )}
            </span>
            <div
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                paymentMethod === 'online' && !onlineDisabled
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                  : 'border-stone-300'
              )}
            >
              {paymentMethod === 'online' && !onlineDisabled && (
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              )}
            </div>
          </div>
          <span className="mt-2 text-[11px] font-medium text-stone-500">
            {onlineDisabled && paymentNotice
              ? paymentNotice
              : 'Wave, Orange Money, MTN MoMo, Moov'}
          </span>
          {!onlineDisabled && (
            <span className="mt-1 text-[11px] font-semibold tabular-nums text-stone-700">
              {onlineFeeHint}
            </span>
          )}
        </button>
      </div>

      {paymentMethod === 'cod' && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-stone-700">
          <p className="flex items-start gap-1.5">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
            <span>Remettez le montant au livreur après vérification de votre colis.</span>
          </p>
        </div>
      )}

      {paymentMethod === 'cash_at_shop' && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-stone-700">
          <p className="flex items-start gap-1.5">
            <Store className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>Vérifiez l&apos;article en boutique à Daloa et réglez sur place.</span>
          </p>
        </div>
      )}
    </div>
  );
};
