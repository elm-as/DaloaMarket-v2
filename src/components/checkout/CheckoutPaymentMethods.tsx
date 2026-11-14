import React from 'react';
import { Truck, ShieldCheck, CreditCard, Banknote, Store } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PaymentNetworkStatus } from '../payment/PaymentNetworkStatus';
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
  };
  onSelect: (method: CheckoutPaymentMethod) => void;
}

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
  } = config;

  const isDeliveryMode = !isPickup;
  const hasMultipleChoices = isPickupAllowed || isCodAllowed || isCodBlocked;

  return (
    <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-stone-900">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-[var(--color-primary)]">
          <CreditCard size={16} />
        </div>
        <span>Mode de paiement</span>
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
              Suspendu jusqu'au {codBlockedFormattedDate} suite à des commandes non réceptionnées.
              Veuillez régler par Mobile Money sécurisé.
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
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold">
                <Banknote className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Paiement à la livraison</span>
              </span>
              <div
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full border-2',
                  paymentMethod === 'cod'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                    : 'border-stone-300'
                )}
              >
                {paymentMethod === 'cod' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <span className="mt-2 text-[11px] font-semibold text-emerald-700">
              Espèces ou Mobile Money au livreur
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
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold">
                <Store className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Espèces au magasin</span>
              </span>
              <div
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full border-2',
                  paymentMethod === 'cash_at_shop'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                    : 'border-stone-300'
                )}
              >
                {paymentMethod === 'cash_at_shop' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <span className="mt-2 text-[11px] font-semibold text-amber-700">
              Payer directement au vendeur sur place
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
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold">
              <CreditCard
                className={cn(
                  'h-4 w-4 shrink-0',
                  onlineDisabled ? 'text-stone-400' : 'text-[var(--color-primary)]'
                )}
              />
              <span>Paiement Mobile Money Sécurisé</span>
              {onlineDisabled && (
                <span className="ml-1 rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-stone-700">
                  Indisponible
                </span>
              )}
            </span>
            <div
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded-full border-2',
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
              : 'Wave, Orange Money, MTN MoMo, Moov, Djamo'}
          </span>
        </button>
      </div>

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-xs font-medium leading-relaxed text-stone-700">
        {paymentMethod === 'online' && (
          <>
            <p className="flex items-start gap-1.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                <strong>Paiement protégé :</strong> Votre argent est sécurisé sous séquestre et vous est{' '}
                <strong>remboursé à 100%</strong> en cas d'annulation ou de non-livraison.
              </span>
            </p>
            <PaymentNetworkStatus className="mt-2.5" />
          </>
        )}
        {paymentMethod === 'cod' && (
          <p className="flex items-start gap-1.5">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
            <span>
              <strong>Livreur affilié :</strong> Livraison assurée par le livreur du vendeur. Remettez
              le montant après vérification du colis.
            </span>
          </p>
        )}
        {paymentMethod === 'cash_at_shop' && (
          <p className="flex items-start gap-1.5">
            <Store className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>Retrait en boutique :</strong> Rendez-vous à la boutique du vendeur à Daloa pour
              vérifier l'article et régler sur place en espèces.
            </span>
          </p>
        )}
      </div>
    </div>
  );
};
