import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Truck } from 'lucide-react';
import { cn, formatPrice } from '../../lib/utils';
import type { CartItem } from '../../contexts/CartContext';
import type { ListingVariant } from '../../types/listing';
import { Button } from '../ui/Button';
import type { DeliveryMode, ListingData, SellerDeliverySettings } from './checkout.types';

interface CheckoutStepModeProps {
  context: {
    isCartMode: boolean;
    isDigital: boolean;
    isPickupAllowed: boolean;
    deliveryMode: DeliveryMode;
    sellerSettings: SellerDeliverySettings;
  };
  items: {
    cartItems: CartItem[];
    listing: ListingData | null;
    directSelectedVariant?: ListingVariant;
  };
  actions: {
    onSelectMode: (mode: DeliveryMode) => void;
    onContinue: () => void;
  };
}

export const CheckoutStepMode: React.FC<CheckoutStepModeProps> = ({ context, items, actions }) => {
  const { isCartMode, isDigital, isPickupAllowed, deliveryMode, sellerSettings } = context;
  const { cartItems, listing, directSelectedVariant } = items;
  const photoUrl = listing?.photos?.[0] || '';

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-4"
    >
      {isCartMode ? (
        <div className="space-y-2.5">
          {cartItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3.5 rounded-xl border border-stone-200 bg-white p-3.5"
            >
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
                {item.listing_photo ? (
                  <img
                    src={item.listing_photo}
                    alt={item.listing_title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-stone-400" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="line-clamp-2 text-sm font-bold leading-snug text-stone-900">
                  {item.listing_title}
                </h2>
                <p className="mt-1 text-xs font-medium tabular-nums text-stone-500">
                  {item.quantity} × {formatPrice(item.listing_price)}
                </p>
                {item.variant_label && (
                  <span className="mt-1 inline-block rounded border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                    Taille : {item.variant_label}
                  </span>
                )}
              </div>
              <p className="flex-shrink-0 text-sm font-extrabold tabular-nums text-[var(--color-primary)]">
                {formatPrice(item.listing_price * item.quantity)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4">
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
            {photoUrl ? (
              <img src={photoUrl} alt={listing?.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ShoppingBag className="h-8 w-8 text-stone-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-[15px] font-bold leading-snug text-stone-900">
              {listing?.title}
            </h2>
            {listing?.original_price != null && listing.original_price > listing.price && (
              <span className="mt-0.5 block text-xs font-medium line-through tabular-nums text-stone-400">
                {formatPrice(listing.original_price)}
              </span>
            )}
            <p className="mt-1 text-lg font-extrabold tabular-nums text-[var(--color-primary)]">
              {formatPrice(directSelectedVariant?.price ?? listing?.price ?? 0)}
            </p>
            {directSelectedVariant && (
              <span className="mt-1 inline-block rounded border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                Taille : {directSelectedVariant.label}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-[var(--color-primary)]">
            <Truck size={16} />
          </div>
          <span>Mode de réception</span>
        </div>

        {isDigital ? (
          <div className="flex items-center justify-between rounded-xl border border-sky-300 bg-sky-50/70 p-4">
            <div>
              <span className="block text-xs font-bold text-sky-950">Envoi numérique direct en privé</span>
              <span className="mt-0.5 block text-[11px] font-medium text-sky-800">
                Document transmis par le vendeur dès confirmation
              </span>
            </div>
            <span className="rounded-md bg-sky-100 px-2.5 py-1 text-xs font-bold tabular-nums text-sky-800">
              GRATUIT (0 F)
            </span>
          </div>
        ) : isPickupAllowed ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={!sellerSettings.home_delivery_enabled}
              onClick={() => actions.onSelectMode('delivery')}
              className={cn(
                'flex flex-col justify-between rounded-xl border-2 p-4 text-left transition-colors',
                !sellerSettings.home_delivery_enabled
                  ? 'cursor-not-allowed border-stone-200 bg-stone-50 opacity-50'
                  : deliveryMode === 'delivery'
                    ? 'border-[var(--color-primary)] bg-orange-50/40 text-stone-900'
                    : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Livraison à domicile</span>
                <div
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border-2',
                    deliveryMode === 'delivery'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                      : 'border-stone-300'
                  )}
                >
                  {deliveryMode === 'delivery' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
              </div>
              <span className="mt-2 text-[11px] font-medium text-stone-500">
                {sellerSettings.home_delivery_enabled
                  ? 'Expédition rapide par livreur'
                  : 'Non proposé par le vendeur'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => actions.onSelectMode('pickup')}
              className={cn(
                'flex flex-col justify-between rounded-xl border-2 p-4 text-left transition-colors',
                deliveryMode === 'pickup'
                  ? 'border-[var(--color-primary)] bg-orange-50/40 text-stone-900'
                  : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Retrait en boutique</span>
                <div
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border-2',
                    deliveryMode === 'pickup'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                      : 'border-stone-300'
                  )}
                >
                  {deliveryMode === 'pickup' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
              </div>
              <span className="mt-2 text-[11px] font-bold text-emerald-700">
                Gratuit (0 FCFA) · Click & Collect
              </span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50/50 p-4">
            <div>
              <span className="block text-xs font-bold text-stone-900">Livraison locale à domicile</span>
              <span className="mt-0.5 block text-[11px] font-medium text-stone-600">
                Expédition sécurisée partout à Daloa
              </span>
            </div>
            <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-primary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </div>
          </div>
        )}
      </div>

      <Button variant="filled" color="primary" size="lg" fullWidth onClick={actions.onContinue} className="rounded-xl font-bold">
        Continuer vers l'adresse →
      </Button>
    </motion.div>
  );
};
