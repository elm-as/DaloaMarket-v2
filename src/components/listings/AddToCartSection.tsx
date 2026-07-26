import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import { Button } from '../ui/Button';
import type { ListingFull } from '../../types/listing';

export const AddToCartSection: React.FC<{ listing: ListingFull }> = ({ listing }) => {
  const navigate = useNavigate();
  const { addToCart, updateQuantity, removeFromCart, items, itemCount } = useCart();
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  const existingItem = items.find(i => i.listing_id === listing.id);
  const currentCartQty = existingItem?.quantity || 0;
  const maxQty = listing.stock ?? 0;

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      if (maxQty <= 0) {
        toast.error('Rupture de stock');
        return;
      }
      await addToCart(listing.id, listing.title, listing.price, listing.photos?.[0] || '', maxQty, qty);
      toast.success(`Ajouté au panier (x${qty})`);
      setQty(1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'ajout");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {currentCartQty > 0 ? (
        /* Déjà dans le panier → contrôles − / + / poubelle (comme ListingCard) */
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-[var(--color-surface-variant)] rounded-full p-0.5">
            <button
              onClick={() => existingItem && updateQuantity(existingItem.id, currentCartQty - 1)}
              disabled={currentCartQty <= 1}
              className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full text-[var(--color-on-surface)] hover:bg-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Réduire la quantité"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[28px] text-center text-[14px] font-semibold text-[var(--color-on-surface)] tabular-nums">
              {currentCartQty}
            </span>
            <button
              onClick={() => existingItem && updateQuantity(existingItem.id, currentCartQty + 1, maxQty)}
              disabled={currentCartQty >= maxQty}
              className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full text-[var(--color-on-surface)] hover:bg-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Augmenter la quantité"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => existingItem && removeFromCart(existingItem.id)}
            className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full text-[var(--color-on-surface-variant)] hover:text-red-500 hover:bg-red-50 transition-colors"
            aria-label="Supprimer du panier"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* Pas encore dans le panier → sélecteur quantité + bouton ajouter */
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-[var(--color-outline)] rounded-[var(--radius-md)] overflow-hidden">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={qty <= 1}
              className="w-10 h-10 flex items-center justify-center text-lg font-semibold text-[var(--color-on-surface)] hover:bg-[var(--color-surface-variant)] disabled:opacity-30 transition-colors"
            >
              −
            </button>
            <span className="w-12 h-10 flex items-center justify-center text-[15px] font-semibold text-[var(--color-on-surface)] border-x border-[var(--color-outline)]">
              {qty}
            </span>
            <button
              onClick={() => setQty(Math.min(maxQty, qty + 1))}
              disabled={qty >= maxQty}
              className="w-10 h-10 flex items-center justify-center text-lg font-semibold text-[var(--color-on-surface)] hover:bg-[var(--color-surface-variant)] disabled:opacity-30 transition-colors"
            >
              +
            </button>
          </div>
          <Button
            variant="filled"
            color="primary"
            size="sm"
            icon={<ShoppingBag className="h-4 w-4" />}
            loading={adding}
            disabled={maxQty <= 0}
            onClick={handleAddToCart}
            className="flex-1"
          >
            Ajouter au panier
          </Button>
        </div>
      )}
      {listing.accepts_delivery && (
        <Button
          variant="outlined"
          color="primary"
          size="sm"
          icon={<ShoppingBag className="h-4 w-4" />}
          onClick={() => navigate(`/checkout/${listing.id}`)}
          fullWidth
        >
          Commander maintenant
        </Button>
      )}
      {itemCount > 0 && (
        <Link to="/panier" className="text-[12px] text-[var(--color-primary)] font-medium text-center hover:underline">
          Voir le panier ({itemCount} article{itemCount > 1 ? 's' : ''})
        </Link>
      )}
    </div>
  );
};

