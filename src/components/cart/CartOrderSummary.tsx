import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';
import type { CartItem } from '../../contexts/CartContext';
import { formatPrice } from '../../lib/utils';
import { Button } from '../ui/Button';

interface CartOrderSummaryProps {
  items: CartItem[];
  onCheckout: () => void;
}

export const CartOrderSummary: React.FC<CartOrderSummaryProps> = ({ items, onCheckout }) => {
  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.listing_price * item.quantity, 0);

  return (
    <>
      <div className="hidden space-y-3 lg:sticky lg:top-20 lg:block">
        <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-base font-bold tracking-tight text-stone-900">
            Résumé de la commande
          </h2>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between font-medium text-stone-600">
              <span>Total articles ({totalQuantity})</span>
              <span className="font-bold text-stone-900 tabular-nums">
                {formatPrice(totalAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-stone-500">
              <span>Frais de livraison</span>
              <span className="font-semibold text-[var(--color-primary)]">Calculés à l'étape suivante</span>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-3">
            <Button
              variant="filled"
              color="primary"
              size="lg"
              className="w-full rounded-xl font-bold"
              icon={<ShieldCheck className="h-4 w-4" />}
              onClick={onCheckout}
            >
              Passer la commande
            </Button>
            <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-stone-500">
              <Lock className="h-3 w-3 text-emerald-600" />
              <span>Paiement sécurisé avec séquestre</span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white/95 px-4 py-2.5 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-stone-400">
              Total ({items.length})
            </span>
            <span className="text-base font-extrabold text-[var(--color-primary)] tabular-nums">
              {formatPrice(totalAmount)}
            </span>
          </div>

          <Button
            variant="filled"
            color="primary"
            size="md"
            className="max-w-[200px] flex-1 rounded-xl py-2.5 text-xs font-bold"
            icon={<ShieldCheck className="h-4 w-4" />}
            onClick={onCheckout}
          >
            Commander
          </Button>
        </div>
      </div>
    </>
  );
};
