import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../../contexts/CartContext';
import { Button } from '../ui/Button';
import type { ListingFull, ListingVariant } from '../../types/listing';


interface AddToCartSectionProps {
  listing: ListingFull;
  selectedVariant?: ListingVariant;
}

export const AddToCartSection: React.FC<AddToCartSectionProps> = ({ listing, selectedVariant }) => {
  const navigate = useNavigate();
  const { addToCart, updateQuantity, removeFromCart, items, itemCount } = useCart();
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const variants = listing.variants || [];
  const hasVariants = variants.length > 0;

  const existingItem = items.find(
    (item) => item.listing_id === listing.id && (item.variant_id || null) === (selectedVariant?.id || null)
  );
  const currentCartQty = existingItem?.quantity || 0;
  const maxQty = selectedVariant ? selectedVariant.stock : (hasVariants ? 0 : listing.stock ?? 0);

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      if (hasVariants && !selectedVariant) {
        toast.error('Choisissez une taille avant de continuer');
        return;
      }
      if (maxQty <= 0) {
        toast.error('Rupture de stock');
        return;
      }
      await addToCart(
        listing.id,
        listing.title,
        selectedVariant?.price ?? listing.price,
        listing.photos?.[0] || '',
        maxQty,
        qty,
        selectedVariant ? { id: selectedVariant.id, label: selectedVariant.label } : undefined,
      );
      toast.success(`Ajouté au panier (x${qty})`);
      setQty(1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'ajout");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">

      {currentCartQty > 0 ? (
        /* Déjà dans le panier → contrôles − / + / poubelle (comme ListingCard) */
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-orange-50 rounded-2xl p-1">
            <button
              onClick={() => {
                if (!existingItem) return;
                if (currentCartQty <= 1) {
                  void removeFromCart(existingItem.id);
                  return;
                }
                void updateQuantity(existingItem.id, currentCartQty - 1, maxQty);
              }}
              className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-xl text-orange-600 hover:bg-white transition-colors"
              aria-label="Réduire la quantité"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[28px] text-center text-[14px] font-extrabold text-gray-900 tabular-nums">
              {currentCartQty}
            </span>
            <button
              onClick={() => existingItem && updateQuantity(existingItem.id, currentCartQty + 1, maxQty)}
              disabled={currentCartQty >= maxQty}
              className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
          <div className="flex items-center bg-gray-50 rounded-2xl overflow-hidden">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={qty <= 1}
              className="w-10 h-11 flex items-center justify-center text-lg font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              −
            </button>
            <span className="w-10 h-11 flex items-center justify-center text-[15px] font-extrabold text-gray-900">
              {qty}
            </span>
            <button
              onClick={() => setQty(Math.min(maxQty, qty + 1))}
              disabled={qty >= maxQty}
              className="w-10 h-11 flex items-center justify-center text-lg font-bold text-orange-600 hover:bg-orange-50 disabled:opacity-30 transition-colors"
            >
              +
            </button>
          </div>
          <Button
            variant="filled"
            color="primary"
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            loading={adding}
            disabled={maxQty <= 0 || (hasVariants && !selectedVariant)}
            onClick={handleAddToCart}
            className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-extrabold shadow-lg shadow-orange-200/60"
          >
            {hasVariants && !selectedVariant ? 'Choisir une taille' : 'Ajouter au panier'}
          </Button>
        </div>
      )}
      {listing.accepts_delivery && (
        <Button
          variant="outlined"
          color="primary"
          size="sm"
          icon={<CreditCard className="h-4 w-4" />}
          onClick={() => {
            if (hasVariants && !selectedVariant) {
              toast.error('Choisissez une taille avant de commander');
              return;
            }
            navigate(`/checkout/${listing.id}`, {
              state: { variantId: selectedVariant?.id },
            });
          }}
          fullWidth
          className="rounded-2xl font-extrabold"
        >
          Commander maintenant
        </Button>
      )}
      {itemCount > 0 && (
        <Link to="/panier" className="text-[12px] text-orange-600 font-bold text-center hover:underline">
          Voir le panier ({itemCount} article{itemCount > 1 ? 's' : ''})
        </Link>
      )}
    </div>
  );
};

