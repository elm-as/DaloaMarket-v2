import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShoppingBag, Truck, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart, type CartItem } from '../contexts/CartContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { supabase } from '../lib/supabase';
import { EmptyState } from '../components/ui/EmptyState';
import { PendingOrderBanner } from '../components/payment/PendingOrderBanner';
import { CartItemRow } from '../components/cart/CartItemRow';
import { CartOrderSummary } from '../components/cart/CartOrderSummary';

const MAX_QUANTITY = 99;

interface ListingRow {
  id: string;
  stock: number | null;
  status: string;
  title: string;
  variants?: Array<{ id: string; stock?: number }> | null;
  user_id?: string | null;
}

const getStockKey = (listingId: string, variantId?: string) => `${listingId}::${variantId || 'base'}`;

function buildRemovalReason(listing: ListingRow | undefined, availableStock: number, hasVariantId: boolean): string {
  if (!listing) return 'annonce supprimée';
  if ((listing.variants?.length ?? 0) > 0 && !hasVariantId) return 'taille à choisir';
  if (availableStock <= 0) return 'rupture de stock';
  return 'taille indisponible';
}

const PanierPage: React.FC = () => {
  const navigate = useNavigate();
  const { items: cartItems, updateQuantity, removeFromCart } = useCart();
  usePageTitle('Mon panier');

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [sellerCount, setSellerCount] = useState(1);

  useEffect(() => {
    const listingIds = [...new Set(cartItems.map((i) => i.listing_id))];
    if (listingIds.length === 0) return;

    supabase
      .from('listings')
      .select('id, stock, status, title, variants, user_id')
      .in('id', listingIds)
      .then(({ data, error }) => {
        if (error) {
          console.warn('[Panier] Échec vérification stocks:', error.message);
          return;
        }
        if (!data) return;

        const map: Record<string, number> = {};
        const dbListings = new Map<string, ListingRow>();
        const uniqueSellers = new Set<string>();

        (data as ListingRow[]).forEach((listing) => {
          if (listing.user_id) uniqueSellers.add(listing.user_id);
          const variants = Array.isArray(listing.variants) ? listing.variants : [];
          map[getStockKey(listing.id)] = listing.stock ?? 0;
          variants.forEach((v) => {
            map[getStockKey(listing.id, v.id)] = v.stock ?? 0;
          });
          dbListings.set(listing.id, { ...listing, variants });
        });

        setStockMap(map);
        setSellerCount(uniqueSellers.size || 1);

        cartItems.forEach((item) => {
          const listing = dbListings.get(item.listing_id);
          const variants = listing?.variants ?? [];
          const variant = item.variant_id ? variants.find((c) => c.id === item.variant_id) : undefined;
          const availableStock = item.variant_id ? (variant?.stock ?? 0) : (listing?.stock ?? 0);
          const isMissingVariant = (item.variant_id && !variant) || (variants.length > 0 && !item.variant_id);

          if (!listing || listing.status !== 'active' || availableStock <= 0 || isMissingVariant) {
            removeFromCart(item.id);
            const suffix = item.variant_label ? ` (${item.variant_label})` : '';
            const reason = buildRemovalReason(listing, availableStock, Boolean(item.variant_id));
            toast.error(`"${item.listing_title}"${suffix} retiré du panier (${reason})`);
          } else if (item.quantity > availableStock) {
            updateQuantity(item.id, availableStock, availableStock);
            const suffix = item.variant_label ? ` (${item.variant_label})` : '';
            toast(`Quantité de "${item.listing_title}"${suffix} ajustée à ${availableStock}`);
          }
        });
      });
  }, [cartItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const getItemMaxQty = (item: CartItem): number => {
    const stock = stockMap[getStockKey(item.listing_id, item.variant_id)] ?? stockMap[item.listing_id];
    if (stock === undefined) return item.quantity;
    return Math.min(Math.max(0, stock), MAX_QUANTITY);
  };

  const handleQuantityChange = (itemId: string, newQty: number) => {
    const item = cartItems.find((i) => i.id === itemId);
    if (!item) return;
    if (newQty < 1) {
      removeFromCart(itemId);
      return;
    }
    const max = getItemMaxQty(item);
    if (max <= 0) {
      toast.error('Produit en rupture de stock');
      removeFromCart(itemId);
      return;
    }
    if (newQty > max) {
      toast.error(`Stock maximum : ${max}`);
      updateQuantity(itemId, max, max);
      return;
    }
    updateQuantity(itemId, newQty, max);
  };

  const handleRemove = (itemId: string) => {
    setRemovingId(itemId);
    setTimeout(() => {
      removeFromCart(itemId);
      setRemovingId(null);
      toast.success('Article supprimé du panier');
    }, 200);
  };

  if (cartItems.length === 0) {
    return (
      <motion.div className="min-h-screen bg-stone-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <header className="border-b border-stone-200 bg-white px-4 py-4">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <Link
              to="/"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50"
              aria-label="Retour"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Sélection</p>
              <h1 className="text-lg font-extrabold text-stone-900">Mon panier</h1>
            </div>
          </div>
        </header>

        <EmptyState
          icon={<ShoppingBag className="h-14 w-14 text-stone-400" />}
          title="Votre panier est vide"
          description="Parcourez les annonces et ajoutez des articles à votre panier."
          action={{ label: 'Voir les annonces', onClick: () => navigate('/') }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div className="min-h-screen bg-stone-50 pb-28 pb-safe" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header className="border-b border-stone-200 bg-white px-4 py-3.5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50"
              aria-label="Retour"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Sélection</p>
              <h1 className="text-lg font-extrabold text-stone-900">Mon panier</h1>
            </div>
          </div>
          <span className="rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-bold text-stone-700 tabular-nums">
            {cartItems.length} article{cartItems.length > 1 ? 's' : ''}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-3 pt-4 sm:px-4 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-6">
        <div className="mb-4 space-y-2.5 lg:mb-0">
          <PendingOrderBanner className="mb-3" />

          <AnimatePresence>
            {cartItems.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                limits={{ maxQty: getItemMaxQty(item), isRemoving: removingId === item.id }}
                actions={{ onQuantityChange: handleQuantityChange, onRemove: handleRemove }}
              />
            ))}
          </AnimatePresence>

          {sellerCount > 1 ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" />
              <div className="leading-snug">
                <p className="font-bold text-emerald-900">
                  Livraison groupée multi-marchands ({sellerCount} boutiques)
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-800">
                  Vos articles sont mutualisés en une course unique (+300 FCFA par boutique supplémentaire au lieu de {sellerCount} courses complètes).
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-700">
              <Truck className="h-4 w-4 flex-shrink-0 text-[var(--color-primary)]" />
              <p>
                <span className="font-semibold">Livraison & Retrait :</span> Frais calculés selon votre quartier à l'étape suivante.
              </p>
            </div>
          )}
        </div>

        <CartOrderSummary items={cartItems} onCheckout={() => navigate('/checkout/cart')} />
      </div>
    </motion.div>
  );
};

export default PanierPage;
