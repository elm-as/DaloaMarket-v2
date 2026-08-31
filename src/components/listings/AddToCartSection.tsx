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
        <div className="flex items-center justify-between gap-2 p-1.5 bg-orange-50/70 border border-orange-100 rounded-2xl">
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-2xs border border-orange-100/80">
            <button
              onClick={() => {
                if (!existingItem) return;
                if (currentCartQty <= 1) {
                  void removeFromCart(existingItem.id);
                  return;
                }
                void updateQuantity(existingItem.id, currentCartQty - 1, maxQty);
              }}
              className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-orange-600 hover:bg-orange-50 active:scale-95 transition-all"
              aria-label="Réduire la quantité"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[30px] text-center text-[14px] font-black text-gray-900 tabular-nums">
              {currentCartQty}
            </span>
            <button
              onClick={() => existingItem && updateQuantity(existingItem.id, currentCartQty + 1, maxQty)}
              disabled={currentCartQty >= maxQty}
              className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all shadow-xs"
              aria-label="Augmenter la quantité"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 justify-end">
            <span className="text-[11px] font-extrabold text-orange-700 bg-orange-100/60 px-2.5 py-1 rounded-xl truncate">
              ✓ Dans votre panier
            </span>
            <button
              onClick={() => existingItem && removeFromCart(existingItem.id)}
              className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 active:scale-95 transition-all"
              aria-label="Supprimer du panier"
              title="Supprimer du panier"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
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
      {/* Bouton Commander maintenant (Achat direct) */}
      {listing.accepts_delivery && (
        <button
          type="button"
          onClick={() => {
            if (hasVariants && !selectedVariant) {
              toast.error('Choisissez une taille avant de commander');
              return;
            }
            navigate(`/checkout/${listing.id}`, {
              state: { variantId: selectedVariant?.id },
            });
          }}
          className="w-full h-11 rounded-2xl border-2 border-orange-500 bg-white hover:bg-orange-50/50 text-orange-600 font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xs"
        >
          <CreditCard className="h-4 w-4" />
          <span>Commander directement (Paiement sécurisé)</span>
        </button>
      )}

      {/* Bouton d'accès au panier élégant et pro */}
      {itemCount > 0 && (
        <Link
          to="/panier"
          className="group w-full h-11 px-4 rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/90 text-orange-900 font-extrabold text-xs flex items-center justify-between shadow-sm hover:shadow hover:border-orange-300 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <CreditCard className="h-3.5 w-3.5 hidden" />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
              >
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
            </div>
            <span className="text-gray-900 tracking-tight">Accéder à mon panier</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-lg bg-orange-500 text-white text-[11px] font-black tabular-nums shadow-xs">
              {itemCount} {itemCount > 1 ? 'articles' : 'article'}
            </span>
            <span className="text-orange-500 font-black text-sm group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </div>
        </Link>
      )}
    </div>
  );
};

