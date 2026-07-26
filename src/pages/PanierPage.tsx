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
  Info,
  Lock,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { formatPrice } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import {
  calculateOrderPricing,
  DELIVERY_MIN,
  DELIVERY_RATE_PER_KM,
  DELIVERY_FREE_KM,
  BUYER_FEE_RATE,
} from "../lib/pricing";
import toast from "react-hot-toast";

const MAX_QUANTITY = 99;

const PanierPage: React.FC = () => {
  const navigate = useNavigate();
  const { items: cartItems, updateQuantity, removeFromCart } = useCart();
  usePageTitle("Mon panier");

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const listingIds = [...new Set(cartItems.map((i) => i.listing_id))];
    if (listingIds.length === 0) return;

    supabase
      .from("listings")
      .select("id, stock, status, title")
      .in("id", listingIds)
      .then(({ data, error }) => {
        if (!error && data) {
          const map: Record<string, number> = {};
          const dbListings = new Map<string, { stock: number; status: string; title: string }>();
          data.forEach((l: any) => {
            map[l.id] = l.stock ?? 0;
            dbListings.set(l.id, { stock: l.stock ?? 0, status: l.status, title: l.title });
          });
          setStockMap(map);

          // Auto-adjust or remove items based on real stock/status
          cartItems.forEach((item) => {
            const listing = dbListings.get(item.listing_id);
            if (!listing || listing.status !== "active" || listing.stock <= 0) {
              // Item sold, deleted, or out of stock
              removeFromCart(item.id);
              toast.error(
                `"${item.listing_title}" a été retiré du panier (${!listing ? 'annonce supprimée' : listing.stock <= 0 ? 'rupture de stock' : 'annonce inactive'})`
              );
            } else if (item.quantity > listing.stock) {
              // Quantity exceeds available stock — cap it
              updateQuantity(item.id, listing.stock, listing.stock);
              toast(
                `Quantité de "${item.listing_title}" ajustée à ${listing.stock} (stock disponible)`,
                { icon: "⚠️" }
              );
            }
          });
        }
      });
  }, [cartItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.listing_price * item.quantity,
    0
  );

  // On PanierPage we don't have seller/buyer coords yet, so delivery = minimum (500F).
  // The real distance-based fee is calculated on CheckoutPage.
  const pricing = calculateOrderPricing(subtotal, 0);
  const deliveryFeeMin = pricing.delivery; // This is the minimum (DELIVERY_MIN)
  const buyerFee = pricing.buyerFee;
  const total = pricing.total;

  const deliveryAndFees = deliveryFeeMin + buyerFee;

  const getItemMaxQty = (item: (typeof cartItems)[0]): number => {
    const stock = stockMap[item.listing_id];
    if (stock === undefined) return item.quantity;
    return Math.min(Math.max(0, stock), MAX_QUANTITY);
  };

  const handleQuantityChange = (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    const item = cartItems.find((i) => i.id === itemId);
    if (!item) return;
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
        className="min-h-screen bg-[var(--color-background)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[var(--color-outline)] px-4 py-3">
          <div className="flex items-center gap-3 max-w-2xl mx-auto">
            <Link
              to="/"
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-[0.97] transition-all"
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5 text-[var(--color-on-surface)]" />
            </Link>
            <h1 className="text-[17px] font-semibold text-[var(--color-on-surface)]">
              Mon panier
            </h1>
          </div>
        </div>

        <EmptyState
          icon={<ShoppingBag className="w-16 h-16 opacity-40" />}
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
      className="min-h-screen bg-[var(--color-background)] pb-safe pb-28"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[var(--color-outline)] px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link
            to="/"
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-[0.97] transition-all"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--color-on-surface)]" />
          </Link>
          <h1 className="text-[17px] font-semibold text-[var(--color-on-surface)]">
            Mon panier
          </h1>
          <span className="ml-auto text-[14px] text-[var(--color-on-surface-variant)]">
            {cartItems.length} article{cartItems.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-2xl mx-auto">
        <AnimatePresence>
          {cartItems.map((item) => {
            const lineTotal = item.listing_price * item.quantity;
            const isRemoving = removingId === item.id;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -80, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <Card
                  elevation={1}
                  padding="md"
                  className={isRemoving ? "opacity-50 pointer-events-none" : ""}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-20 h-20 flex-shrink-0 rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-surface-variant)]">
                      {item.listing_photo ? (
                        <img
                          src={item.listing_photo}
                          alt={item.listing_title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-[var(--color-on-surface-variant)] opacity-40" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/listings/${item.listing_id}`}
                        className="text-[15px] font-semibold text-[var(--color-on-surface)] leading-tight line-clamp-2 hover:text-[var(--color-primary)] transition-colors"
                      >
                        {item.listing_title}
                      </Link>

                      <p className="text-[14px] text-[var(--color-on-surface-variant)] mt-1">
                        {formatPrice(item.listing_price)} / unité
                      </p>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1 bg-[var(--color-surface-variant)] rounded-full p-0.5">
                          <button
                            onClick={() =>
                              handleQuantityChange(item.id, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                            className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full text-[var(--color-on-surface)] hover:bg-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label="Réduire la quantité"
                          >
                            <Minus className="h-4 w-4" />
                          </button>

                          <span className="min-w-[28px] text-center text-[15px] font-semibold text-[var(--color-on-surface)] tabular-nums">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              handleQuantityChange(item.id, item.quantity + 1)
                            }
                            disabled={item.quantity >= getItemMaxQty(item)}
                            className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full text-[var(--color-on-surface)] hover:bg-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label="Augmenter la quantité"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-bold text-[var(--color-on-surface)] tabular-nums">
                            {formatPrice(lineTotal)}
                          </span>
                          <button
                            onClick={() => handleRemove(item.id)}
                            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-[var(--color-on-surface-variant)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-light)] transition-colors"
                            aria-label={`Supprimer ${item.listing_title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <Card elevation={2} padding="md" className="mt-4">
          <h2 className="text-[15px] font-semibold text-[var(--color-on-surface)] mb-4">
            Résumé du panier
          </h2>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-[var(--color-on-surface-variant)] flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4" />
                Sous-total
              </span>
              <span className="font-medium text-[var(--color-on-surface)] tabular-nums">
                {formatPrice(subtotal)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[14px]">
              <span className="text-[var(--color-on-surface-variant)] flex items-center gap-1.5">
                <Truck className="h-4 w-4" />
                Livraison et frais
                <span className="group relative cursor-help">
                  <Info className="h-3.5 w-3.5 text-[var(--color-on-surface-variant)] opacity-50" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-gray-900 text-white text-[11px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 leading-relaxed pointer-events-none">
                    Livraison : à partir de {formatPrice(deliveryFeeMin)} (base {DELIVERY_MIN} FCFA, puis {DELIVERY_RATE_PER_KM} FCFA/km au-delà de {DELIVERY_FREE_KM} km). Frais de service : {(BUYER_FEE_RATE * 100)}%
                  </span>
                </span>
              </span>
              <span className="font-medium text-[var(--color-on-surface)] tabular-nums">
                à partir de {formatPrice(deliveryAndFees)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[12px] px-1 pt-0.5 bg-amber-50 border border-amber-200 rounded-lg p-2">
              <Info className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
              <span className="text-amber-700">
                Le montant exact de la livraison sera calculé au checkout selon la distance vendeur → acheteur.
              </span>
            </div>

            <div className="border-t border-[var(--color-outline)] pt-3 mt-1" />

            <div className="flex items-center justify-between">
              <span className="text-[17px] font-semibold text-[var(--color-on-surface)]">
                Total estimé
              </span>
              <span className="text-[20px] font-bold text-[var(--color-primary)] tabular-nums">
                ~ {formatPrice(total)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[var(--color-outline)] px-3 py-2.5 md:hidden">
        <div className="flex flex-col gap-1.5 max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-[var(--color-on-surface-variant)]">
                Total estimé
              </span>
              <span className="text-[18px] font-bold text-[var(--color-primary)] tabular-nums">
                ~ {formatPrice(total)}
              </span>
            </div>
            <Button
              variant="filled"
              color="primary"
              size="md"
              icon={<ShieldCheck className="h-4 w-4" />}
              onClick={handleCheckout}
            >
              Payer {formatPrice(total)} F CFA
            </Button>
          </div>
          <div className="flex items-center justify-center gap-3 text-[11px] text-[var(--color-on-surface-variant)]">
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3" /> Paiement 100% sécurisé
            </span>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-2">
              <img src="/Orange_logo.svg" alt="Orange Money" className="h-3.5 object-contain" />
              <img src="/MTN logo.jpeg" alt="MTN MoMo" className="h-3.5 rounded-sm object-contain" />
              <img src="/wave-logo.png" alt="Wave" className="h-3.5 rounded-sm object-contain" />
            </span>
          </div>
        </div>
      </div>

      <div className="hidden md:flex flex-col items-end px-4 pb-6 max-w-2xl mx-auto gap-2">
        <Button
          variant="filled"
          color="primary"
          size="lg"
          icon={<ShieldCheck className="h-5 w-5" />}
          onClick={handleCheckout}
        >
          Payer {formatPrice(total)} F CFA en sécurité
        </Button>
        <div className="flex items-center gap-3 text-[12px] text-[var(--color-on-surface-variant)]">
          <span className="flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" /> Paiement 100% sécurisé
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-2">
            <img src="/Orange_logo.svg" alt="Orange Money" className="h-4 object-contain" />
            <img src="/MTN logo.jpeg" alt="MTN MoMo" className="h-4 rounded-sm object-contain" />
            <img src="/wave-logo.png" alt="Wave" className="h-4 rounded-sm object-contain" />
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default PanierPage;
