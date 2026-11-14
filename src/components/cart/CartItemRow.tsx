import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Trash2, Minus, Plus } from 'lucide-react';
import type { CartItem } from '../../contexts/CartContext';
import { formatPrice, cn } from '../../lib/utils';

interface CartItemRowProps {
  item: CartItem;
  limits: {
    maxQty: number;
    isRemoving: boolean;
  };
  actions: {
    onQuantityChange: (itemId: string, newQty: number) => void;
    onRemove: (itemId: string) => void;
  };
}

export const CartItemRow: React.FC<CartItemRowProps> = ({ item, limits, actions }) => {
  const lineTotal = item.listing_price * item.quantity;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -60, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={cn(
          'rounded-xl border border-stone-200 bg-white p-3 transition-opacity',
          limits.isRemoving && 'pointer-events-none opacity-50'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
            {item.listing_photo ? (
              <img
                src={item.listing_photo}
                alt={item.listing_title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-stone-400" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1.5">
              <Link
                to={`/listings/${item.listing_id}`}
                className="line-clamp-1 text-xs font-bold text-stone-900 transition-colors hover:text-[var(--color-primary)] sm:text-sm"
              >
                {item.listing_title}
              </Link>
              <button
                type="button"
                onClick={() => actions.onRemove(item.id)}
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label={`Supprimer ${item.listing_title}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-stone-600 tabular-nums">
                {formatPrice(item.listing_price)}
              </span>
              {item.variant_label && (
                <span className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-semibold text-stone-700">
                  {item.variant_label}
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-1.5">
              <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 p-0.5">
                <button
                  type="button"
                  onClick={() => actions.onQuantityChange(item.id, item.quantity - 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-stone-700 hover:text-stone-900"
                  aria-label="Réduire la quantité"
                >
                  <Minus className="h-3 w-3" />
                </button>

                <span className="min-w-[22px] text-center text-xs font-bold text-stone-900 tabular-nums">
                  {item.quantity}
                </span>

                <button
                  type="button"
                  onClick={() => actions.onQuantityChange(item.id, item.quantity + 1)}
                  disabled={item.quantity >= limits.maxQty}
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-primary)] text-white disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Augmenter la quantité"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <span className="text-xs font-extrabold text-[var(--color-primary)] tabular-nums sm:text-sm">
                {formatPrice(lineTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
