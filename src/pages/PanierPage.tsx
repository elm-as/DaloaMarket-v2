import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  ShieldCheck,
  Truck,
  Lock,
} from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { formatPrice, cn } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import toast from "react-hot-toast";

const MAX_QUANTITY = 99;

const PanierPage: React.FC = () => {
  const navigate = useNavigate();
  const { items: cartItems, updateQuantity, removeFromCart } = useCart();
  usePageTitle("Mon panier");

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  const getStockKey = (listingId: string, variantId?: string) => `${listingId}::${variantId || 'base'}`;

  useEffect(() => {
    const listingIds = [...new Set(cartItems.map((i) => i.listing_id))];
    if (listingIds.length === 0) return;

    supabase
      .from("listings")
      .select("id, stock, status, title, variants")
      .in("id", listingIds)
      .then(({ data, error }) => {
        if (!error && data) {
          const map: Record<string, number> = {};
          const dbListings = new Map<string, { stock: number; status: string; title: string; variants: any[] }>();
          data.forEach((l: any) => {
            const variants = Array.isArray(l.variants) ? l.variants : [];
            map[getStockKey(l.id)] = l.stock ?? 0;
            variants.forEach((variant: any) => {
              map[getStockKey(l.id, variant.id)] = variant.stock ?? 0;
            });
            dbListings.set(l.id, { stock: l.stock ?? 0, status: l.status, title: l.title, variants });
          });
          setStockMap(map);

          // Auto-adjust or remove items based on real stock/status
          cartItems.forEach((item) => {
            const listing = dbListings.get(item.listing_id);
            const variant = item.variant_id ? listing?.variants.find((candidate: any) => candidate.id === item.variant_id) : undefined;
            const availableStock = item.variant_id ? (variant?.stock ?? 0) : (listing?.stock ?? 0);
            if (!listing || listing.status !== "active" || availableStock <= 0 || (item.variant_id && !variant) || (listing.variants.length > 0 && !item.variant_id)) {
              // Item sold, deleted, or out of stock
              removeFromCart(item.id);
              toast.error(
                `"${item.listing_title}"${item.variant_label ? ` (${item.variant_label})` : ''} a été retiré du panier (${!listing ? 'annonce supprimée' : listing.variants.length > 0 && !item.variant_id ? 'taille à choisir' : availableStock <= 0 ? 'rupture de stock' : 'taille indisponible'})`
              );
            } else if (item.quantity > availableStock) {
              // Quantity exceeds available stock — cap it
              updateQuantity(item.id, availableStock, availableStock);
              toast(
                `Quantité de "${item.listing_title}"${item.variant_label ? ` (${item.variant_label})` : ''} ajustée à ${availableStock}`,
                { icon: "⚠️" }
              );
            }
          });
        }
      });
  }, [cartItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const getItemMaxQty = (item: (typeof cartItems)[0]): number => {
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
      toast.error("Produit en rupture de stock");
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
      toast.success("Article supprimé du panier");
    }, 200);
  };

  const handleCheckout = () => {
    navigate("/checkout/cart");
  };

  if (cartItems.length === 0) {
    return (
      <motion.div
        className="min-h-screen bg-gray-50/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 px-5 pt-5 pb-14 rounded-b-[36px] shadow-lg">
          <div className="absolute -top-12 -right-10 w-36 h-36 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <Link to="/" className="w-10 h-10 inline-flex items-center justify-center rounded-2xl bg-white/15 text-white hover:bg-white/25 active:scale-95 transition-all" aria-label="Retour">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-100">Votre sélection</p>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">Mon panier</h1>
            </div>
          </div>
        </div>

        <EmptyState
          icon={<ShoppingBag className="w-16 h-16 text-orange-400 opacity-70" />}
          title="Votre panier est vide"
          description="Parcourez les annonces et ajoutez des articles à votre panier."
          action={{
            label: "Voir les annonces",
            onClick: () => navigate("/"),
          }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gray-50/70 pb-safe pb-28"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {/* ── COMPACT HERO BANNER ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 px-4 pt-4 pb-10 rounded-b-[28px] shadow-md">
        <div className="absolute -top-10 -right-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-6 w-24 h-24 rounded-full bg-white/10" />
        <div className="relative max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="w-8 h-8 inline-flex items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 active:scale-95 transition-all"
              aria-label="Retour"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-orange-100">
                Votre sélection
              </p>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
                Mon panier
              </h1>
            </div>
          </div>
          <span className="rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-extrabold text-white border border-white/20">
            {cartItems.length} article{cartItems.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── CONTENT (OVERLAPPING HERO) ── */}
      <div className="relative z-10 -mt-5 max-w-4xl mx-auto px-3 sm:px-4 lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start">
        {/* Items List */}
        <div className="space-y-2.5 mb-4 lg:mb-0">
          <AnimatePresence>
            {cartItems.map((item) => {
              const lineTotal = item.listing_price * item.quantity;
              const isRemoving = removingId === item.id;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -60, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className={cn(
                      "bg-white rounded-2xl p-3 border border-gray-100 shadow-sm transition-all",
                      isRemoving && "opacity-50 pointer-events-none"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Thumbnail */}
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-orange-50/40 border border-orange-100/40">
                        {item.listing_photo ? (
                          <img
                            src={item.listing_photo}
                            alt={item.listing_title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-orange-400 opacity-40" />
                          </div>
                        )}
                      </div>

                      {/* Item details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1.5">
                          <Link
                            to={`/listings/${item.listing_id}`}
                            className="text-xs sm:text-sm font-extrabold text-gray-900 line-clamp-1 hover:text-orange-600 transition-colors"
                          >
                            {item.listing_title}
                          </Link>
                          <button
                            onClick={() => handleRemove(item.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 active:scale-95 transition-all flex-shrink-0"
                            aria-label={`Supprimer ${item.listing_title}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Price & Variant Pill */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-semibold text-gray-500">
                            {formatPrice(item.listing_price)}
                          </span>
                          {item.variant_label && (
                            <span className="px-1.5 py-0.5 rounded-md bg-orange-50 text-[10px] font-bold text-orange-700 border border-orange-200/50">
                              {item.variant_label}
                            </span>
                          )}
                        </div>

                        {/* Quantity Stepper & Line Total */}
                        <div className="mt-2 flex items-center justify-between pt-1 border-t border-gray-50">
                          {/* Stepper (+/-) */}
                          <div className="flex items-center gap-1 rounded-xl bg-gray-50 p-0.5 border border-gray-100">
                            <button
                              onClick={() =>
                                handleQuantityChange(item.id, item.quantity - 1)
                              }
                              className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-gray-700 shadow-2xs hover:text-orange-600 active:scale-95 transition-all"
                              aria-label="Réduire la quantité"
                            >
                              <Minus className="h-3 w-3" />
                            </button>

                            <span className="min-w-[22px] text-center text-xs font-black text-gray-900 tabular-nums">
                              {item.quantity}
                            </span>

                            <button
                              onClick={() =>
                                handleQuantityChange(item.id, item.quantity + 1)
                              }
                              disabled={item.quantity >= getItemMaxQty(item)}
                              className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
                              aria-label="Augmenter la quantité"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Line Total */}
                          <span className="text-xs sm:text-sm font-black text-orange-600 tabular-nums">
                            {formatPrice(lineTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Delivery Note banner */}
          <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-2.5 shadow-2xs flex items-center gap-2 text-[11px] text-orange-950">
            <Truck className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" />
            <p className="leading-snug">
              <span className="font-bold">Livraison & Retrait :</span> Frais exacts calculés selon votre quartier à l'étape suivante.
            </p>
          </div>
        </div>

        {/* Desktop Sticky Summary */}
        <div className="hidden space-y-3 lg:sticky lg:top-20 lg:block">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-md shadow-gray-200/50 p-5 space-y-4">
            <h2 className="text-base font-extrabold tracking-tight text-gray-900">
              Résumé de la commande
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-gray-600 font-medium">
                <span>Total articles ({cartItems.reduce((acc, i) => acc + i.quantity, 0)})</span>
                <span className="font-extrabold text-gray-900">
                  {formatPrice(cartItems.reduce((sum, item) => sum + item.listing_price * item.quantity, 0))}
                </span>
              </div>
              <div className="flex justify-between items-center text-gray-500">
                <span>Frais de livraison</span>
                <span className="font-bold text-orange-600">Calculés au checkout</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <Button
                variant="filled"
                color="primary"
                size="lg"
                className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-extrabold shadow-md shadow-orange-500/20 active:scale-[0.98]"
                icon={<ShieldCheck className="h-4 w-4" />}
                onClick={handleCheckout}
              >
                Passer la commande
              </Button>
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-gray-500 mt-2.5">
                <Lock className="h-3 w-3 text-emerald-600" />
                <span>Paiement sécurisé Escrow</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE STICKY BOTTOM CTA BAR ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-100 bg-white/95 px-4 py-2.5 shadow-[0_-6px_20px_rgba(0,0,0,0.06)] backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Total ({cartItems.length})
            </span>
            <span className="text-base font-black text-orange-600 tabular-nums">
              {formatPrice(cartItems.reduce((sum, item) => sum + item.listing_price * item.quantity, 0))}
            </span>
          </div>

          <Button
            variant="filled"
            color="primary"
            size="md"
            className="flex-1 max-w-[200px] rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 font-extrabold text-xs shadow-md shadow-orange-500/20 active:scale-[0.98] py-2.5"
            icon={<ShieldCheck className="h-4 w-4" />}
            onClick={handleCheckout}
          >
            Commander
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default PanierPage;
