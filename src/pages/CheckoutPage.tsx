import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ShoppingBag,
  Truck,
  Shield,
  CreditCard,
  MapPin,
  Info,
  ChevronRight,
  Navigation,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useCart } from "../context/CartContext";
import { supabase } from "../lib/supabase";
import { useSupabase } from "../hooks/useSupabase";
import { usePageTitle } from "../hooks/usePageTitle";
import { isCurfewActive } from "../utils/timeConstraints";
import { formatPrice, cn } from "../lib/utils";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { EmptyState } from "../components/ui/EmptyState";
import { LocationPicker } from "../components/ui/LocationPicker";
import {
  calculateOrderPricing,
  haversineDistance,
  BUYER_FEE_RATE,
  DELIVERY_MIN,
  DELIVERY_RATE_PER_KM,
  DELIVERY_FREE_KM,
} from "../lib/pricing";
import type { LatLng } from "../lib/pricing";
import { affiliatedDeliverersService } from "../services/affiliatedDeliverersService";

interface ListingData {
  id: string;
  title: string;
  price: number;
  photos: string[];
  user_id: string;
  latitude: number | null;
  longitude: number | null;
  original_price: number | null;
  seller_shop_latitude: number | null;
  seller_shop_longitude: number | null;
  is_seller_pro?: boolean;
}

const CheckoutPage: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { user } = useSupabase();
  const { items: cartItems, clearCart, removeFromCart, updateQuantity } = useCart();
  usePageTitle("Commander");

  const isCartMode = !listingId || listingId === "cart";

  const [listing, setListing] = useState<ListingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [addressError, setAddressError] = useState(false);
  const [deliveryLatitude, setDeliveryLatitude] = useState<number>(6.8774);
  const [deliveryLongitude, setDeliveryLongitude] = useState<number>(-6.4502);
  const [paying, setPaying] = useState(false);
  const [distanceKm, setDistanceKm] = useState(0);
  const [cartSellers, setCartSellers] = useState<Map<string, { lat: number; lng: number; isPro?: boolean }>>(new Map());
  const [isCartSelfCheckout, setIsCartSelfCheckout] = useState(false);
  const [sellerSettings, setSellerSettings] = useState<{ home_delivery_enabled: boolean; cash_on_delivery_enabled: boolean }>({
    home_delivery_enabled: true,
    cash_on_delivery_enabled: false,
  });
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod' | 'cash_at_shop'>('online');
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const handleHeaderBack = () => {
    if (step > 1) {
      if (step === 3 && deliveryMode === 'pickup') {
        setStep(1);
      } else {
        setStep((prev) => (prev - 1) as 1 | 2 | 3);
      }
    } else {
      navigate(isCartMode ? "/panier" : `/listings/${listing?.id || ''}`);
    }
  };

  const handleStep1Next = () => {
    if (deliveryMode === 'pickup') {
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const handleStep2Next = () => {
    if (!deliveryAddress.trim()) {
      setAddressError(true);
      toast.error("Veuillez renseigner une adresse de livraison (Quartier, repère, etc.)");
      return;
    }
    setStep(3);
  };

  const buyerCoords: LatLng | null =
    deliveryLatitude != null && deliveryLongitude != null
      ? { latitude: deliveryLatitude, longitude: deliveryLongitude }
      : null;

  const sellerCoords: LatLng | null =
    listing?.seller_shop_latitude != null && listing?.seller_shop_longitude != null
      ? { latitude: listing.seller_shop_latitude, longitude: listing.seller_shop_longitude }
      : listing?.latitude != null && listing?.longitude != null
        ? { latitude: listing.latitude, longitude: listing.longitude }
        : null;

  useEffect(() => {
    if (isCartMode) {
      const fetchCartSellers = async () => {
        setLoading(true);
        const sellerIds = [...new Set(cartItems.map(item => item.listing_id))];
        if (sellerIds.length === 0) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("listings")
          .select("id, user_id, stock, status, title, seller:users!listings_user_id_fkey(shop_latitude, shop_longitude, pro_until)")
          .in("id", sellerIds);

        if (!error && data) {
          const sellerMap = new Map<string, { lat: number; lng: number; isPro?: boolean }>();
          let hasSelfItem = false;
          let hasInvalidItem = false;

          (data as any[]).forEach(item => {
            if (item.user_id === user?.id) hasSelfItem = true;
            const lat = item.seller?.shop_latitude;
            const lng = item.seller?.shop_longitude;
            const isPro = item.seller?.pro_until ? new Date(item.seller.pro_until) > new Date() : false;
            if (lat != null && lng != null) {
              sellerMap.set(item.id, { lat, lng, isPro });
            }
          });

          // Validate stock and status for each cart item
          const dbMap = new Map<string, { stock: number; status: string; title: string }>();
          (data as any[]).forEach(item => {
            dbMap.set(item.id, { stock: item.stock ?? 0, status: item.status, title: item.title });
          });

          for (const cartItem of cartItems) {
            const listing = dbMap.get(cartItem.listing_id);
            if (!listing || listing.status !== "active" || listing.stock <= 0) {
              removeFromCart(cartItem.id);
              toast.error(
                `"${cartItem.listing_title}" n'est plus disponible et a été retiré du panier`
              );
              hasInvalidItem = true;
            } else if (cartItem.quantity > listing.stock) {
              updateQuantity(cartItem.id, listing.stock, listing.stock);
              toast(
                `Quantité de "${cartItem.listing_title}" ajustée à ${listing.stock} (stock disponible)`,
                { icon: "⚠️" }
              );
              hasInvalidItem = true;
            }
          }

          if (hasInvalidItem) {
            navigate("/panier");
            return;
          }

          setCartSellers(sellerMap);
          setIsCartSelfCheckout(hasSelfItem);

          if (data.length > 0 && data[0].user_id) {
            const s = await affiliatedDeliverersService.getSellerDeliverySettings(data[0].user_id);
            setSellerSettings({
              home_delivery_enabled: s.home_delivery_enabled,
              cash_on_delivery_enabled: s.cash_on_delivery_enabled,
            });
            if (!s.home_delivery_enabled) {
              setDeliveryMode('pickup');
              setPaymentMethod('cash_at_shop');
            }
          }
        }
        setLoading(false);
      };

      fetchCartSellers();
      return;
    }

    if (!listingId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const fetchListing = async () => {
      setLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from("listings")
        .select("id, title, price, photos, user_id, original_price, stock, status, seller:users!listings_user_id_fkey(shop_latitude, shop_longitude, pro_until)")
        .eq("id", listingId)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const listingData = data as any;

      // Validate stock and status
      if (listingData.status !== "active" || (listingData.stock ?? 0) <= 0) {
        toast.error("Cette annonce n'est plus disponible");
        navigate("/");
        return;
      }

      const isSellerPro = listingData.seller?.pro_until ? new Date(listingData.seller.pro_until) > new Date() : false;

      const processedData: ListingData = {
        id: listingData.id,
        title: listingData.title,
        price: listingData.price,
        photos: listingData.photos,
        user_id: listingData.user_id,
        latitude: listingData.seller?.shop_latitude ?? null,
        longitude: listingData.seller?.shop_longitude ?? null,
        original_price: listingData.original_price,
        seller_shop_latitude: listingData.seller?.shop_latitude ?? null,
        seller_shop_longitude: listingData.seller?.shop_longitude ?? null,
        is_seller_pro: isSellerPro,
      };

      setListing(processedData);

      if (listingData.user_id) {
        const s = await affiliatedDeliverersService.getSellerDeliverySettings(listingData.user_id);
        setSellerSettings({
          home_delivery_enabled: s.home_delivery_enabled,
          cash_on_delivery_enabled: s.cash_on_delivery_enabled,
        });
        if (!s.home_delivery_enabled) {
          setDeliveryMode('pickup');
          setPaymentMethod('cash_at_shop');
        }
      }

      setLoading(false);
    };

    fetchListing();
  }, [listingId, isCartMode, cartItems, user?.id]);

  useEffect(() => {
    if (!buyerCoords) {
      setDistanceKm(0);
      return;
    }

    if (isCartMode) {
      if (cartSellers.size === 0) {
        setDistanceKm(0);
        return;
      }

      let maxDistance = 0;
      cartSellers.forEach(seller => {
        const d = haversineDistance(buyerCoords, { latitude: seller.lat, longitude: seller.lng });
        if (d > maxDistance) maxDistance = d;
      });
      setDistanceKm(Number(maxDistance.toFixed(1)));
    } else {
      if (!sellerCoords) {
        setDistanceKm(0);
        return;
      }

      const d = haversineDistance(buyerCoords, sellerCoords);
      setDistanceKm(Number(d.toFixed(1)));
    }
  }, [buyerCoords?.latitude, buyerCoords?.longitude, sellerCoords?.latitude, sellerCoords?.longitude, isCartMode, cartSellers]);

  const isSellerPro = isCartMode
    ? (cartItems.length > 0 && cartItems.every(item => cartSellers.get(item.listing_id)?.isPro === true))
    : (listing?.is_seller_pro ?? false);

  useEffect(() => {
    if (!isSellerPro) {
      if (deliveryMode !== 'delivery') setDeliveryMode('delivery');
      if (paymentMethod !== 'online') setPaymentMethod('online');
    }
  }, [isSellerPro, deliveryMode, paymentMethod]);

  const productAmount = isCartMode
    ? cartItems.reduce((sum, item) => sum + item.listing_price * item.quantity, 0)
    : listing?.price ?? 0;

  const isPickup = deliveryMode === 'pickup';
  const pricing = calculateOrderPricing(productAmount, distanceKm, isSellerPro);
  const deliveryFee = isPickup ? 0 : pricing.delivery;
  const buyerFee = pricing.buyerFee;
  const deliveryAndFees = deliveryFee + buyerFee;
  const total = productAmount + deliveryAndFees;

  const isSelfCheckout = isCartMode ? isCartSelfCheckout : listing?.user_id === user?.id;

  const handlePay = async () => {
    if (!user) return;

    if (deliveryMode === 'delivery' && !deliveryAddress.trim()) {
      setAddressError(true);
      toast.error("Veuillez renseigner une adresse de livraison (Quartier, repère, etc.)");
      return;
    }

    if (!isSellerPro && (paymentMethod !== 'online' || deliveryMode !== 'delivery')) {
      toast.error("Le retrait en boutique et le paiement à la livraison sont réservés aux Vendeurs Pro.");
      return;
    }

    setPaying(true);
    try {
      if (paymentMethod === 'cash_at_shop' || deliveryMode === 'pickup') {
        const targetListingId = isCartMode ? cartItems[0].listing_id : listing!.id;

        const { data: listingInfo, error: listErr } = await supabase
          .from("listings")
          .select("user_id")
          .eq("id", targetListingId)
          .single();

        if (listErr || !listingInfo) throw new Error("Impossible de trouver le vendeur de cet article");

        const { data: orderData, error: orderErr } = await supabase
          .from("orders")
          .insert({
            buyer_id: user.id,
            seller_id: listingInfo.user_id,
            listing_id: targetListingId,
            product_amount: productAmount,
            delivery_fee: 0,
            platform_commission: buyerFee,
            total_amount: total,
            delivery_address: "Retrait en boutique",
            delivery_mode: "pickup",
            payment_method: paymentMethod === 'cash_at_shop' ? "cash_at_shop" : "online",
            status: "pending_seller_confirmation",
          } as any)
          .select("id")
          .single();

        if (orderErr || !orderData) {
          throw new Error(orderErr?.message || "Erreur de création de la commande");
        }

        if (isCartMode) clearCart();

        toast.success("Réservation enregistrée ! Vous réglerez le vendeur directement à la boutique.");
        navigate("/mes-commandes");
        return;
      }

      if (paymentMethod === 'cod') {
        const targetListingId = isCartMode ? cartItems[0].listing_id : listing!.id;

        // Récupérer le vrai seller_id pour listing
        const { data: listingInfo, error: listErr } = await supabase
          .from("listings")
          .select("user_id")
          .eq("id", targetListingId)
          .single();

        if (listErr || !listingInfo) throw new Error("Impossible de trouver le vendeur de cet article");

        // 1. Créer la commande COD avec statut pending_seller_confirmation
        const { data: orderData, error: orderErr } = await supabase
          .from("orders")
          .insert({
            buyer_id: user.id,
            seller_id: listingInfo.user_id,
            listing_id: targetListingId,
            product_amount: productAmount,
            delivery_fee: deliveryFee,
            platform_commission: buyerFee,
            total_amount: total,
            delivery_address: deliveryAddress || "Daloa",
            delivery_mode: "delivery",
            payment_method: "cod",
            status: "pending_seller_confirmation",
          } as any)
          .select("id")
          .single();

        if (orderErr || !orderData) {
          throw new Error(orderErr?.message || "Erreur de création de la commande");
        }

        // 2. Créer l'assignment de livraison privée
        const { error: assignErr } = await supabase
          .from("delivery_assignments")
          .insert({
            order_id: orderData.id,
            seller_id: listingInfo.user_id,
            is_private: true,
            status: "pending_seller_confirmation",
            delivery_price: deliveryFee,
            dropoff_location: deliveryAddress || "Daloa",
            pickup_otp: Math.floor(100000 + Math.random() * 900000).toString(),
            delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
          } as any);

        if (assignErr) {
          console.error("Assignment creation error:", assignErr);
        }

        if (isCartMode) clearCart();

        toast.success("Commande enregistrée (Paiement à la livraison) ! Le vendeur va confirmer la disponibilité.");
        navigate("/mes-commandes");
        return;
      }

      const { createOrder } = await import("../lib/payment");

      const processItem = async (listingId: string) => {
        const result = await createOrder({
          buyer_id: user.id,
          listing_id: listingId,
          delivery_address: deliveryAddress || "Daloa",
          delivery_mode: "delivery",
          delivery_lat: deliveryLatitude,
          delivery_lng: deliveryLongitude,
          amount: total,
        });
        if (result.payment_url) {
          window.location.href = result.payment_url;
        } else {
          throw new Error("Aucune URL de paiement reçue");
        }
      };

      if (isCartMode) {
        if (cartItems.length > 1) {
          toast.error("Le panier multi-vendeurs nécessite plusieurs paiements. Traitement du premier article...");
        }
        await processItem(cartItems[0].listing_id);
      } else {
        await processItem(listing!.id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la commande";
      toast.error(message);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isCartMode && cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-background)]">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[var(--color-outline)] px-4 py-3">
          <Link
            to="/panier"
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-[0.97] transition-all"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--color-on-surface)]" />
          </Link>
        </div>
        <EmptyState
          title="Panier vide"
          description="Ajoutez des articles avant de commander."
          action={{ label: "Voir le panier", onClick: () => navigate("/panier") }}
        />
      </div>
    );
  }

  if (!isCartMode && (notFound || !listing)) {
    return (
      <div className="min-h-screen bg-[var(--color-background)]">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[var(--color-outline)] px-4 py-3">
          <Link
            to="/"
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-[0.97] transition-all"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--color-on-surface)]" />
          </Link>
        </div>
        <EmptyState
          title="Annonce introuvable"
          description="Cette annonce n'existe pas ou a été supprimée."
          action={{ label: "Retour à l'accueil", onClick: () => navigate("/") }}
        />
      </div>
    );
  }

  const photoUrl = listing?.photos?.[0] || "";

  return (
    <motion.div
      className="min-h-screen bg-[var(--color-background)] pb-safe pb-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* HEADER WITH STEPPER */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[var(--color-outline)] shadow-xs">
        <div className="flex items-center gap-3 max-w-2xl mx-auto px-4 py-3">
          <button
            type="button"
            onClick={handleHeaderBack}
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-[0.97] transition-all"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--color-on-surface)]" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold text-[var(--color-on-surface)] leading-tight truncate">
              {isCartMode ? "Commander le panier" : "Commande"} — Étape {step}/3
            </h1>
            <p className="text-[11px] text-[var(--color-on-surface-variant)] truncate">
              {step === 1
                ? "1. Articles & Mode de réception"
                : step === 2
                ? "2. Adresse & Lieu de livraison"
                : "3. Récapitulatif & Paiement"}
            </p>
          </div>
        </div>

        {/* STEPPER PROGRESS BAR */}
        <div className="bg-gray-50 border-t border-gray-100 py-2.5 px-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between relative px-2">
            {/* Connecting line */}
            <div className="absolute top-4 left-10 right-10 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
            <div
              className="absolute top-4 left-10 h-0.5 bg-[var(--color-primary)] -translate-y-1/2 z-0 transition-all duration-300"
              style={{
                width: step === 1 ? '0%' : step === 2 ? '50%' : '100%',
              }}
            />

            {/* Step 1 */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="relative z-10 flex flex-col items-center gap-1 group focus:outline-none"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs",
                  step === 1
                    ? "bg-[var(--color-primary)] text-white ring-4 ring-[#FF7F00]/20"
                    : step > 1
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-500 border border-gray-200"
                )}
              >
                {step > 1 ? "✓" : "1"}
              </div>
              <span className={cn("text-[11px] font-semibold transition-colors", step === 1 ? "text-[var(--color-primary)]" : "text-gray-500")}>
                Réception
              </span>
            </button>

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => {
                if (deliveryMode === 'pickup') return;
                setStep(2);
              }}
              disabled={deliveryMode === 'pickup'}
              className={cn(
                "relative z-10 flex flex-col items-center gap-1 group focus:outline-none",
                deliveryMode === 'pickup' && "opacity-40 cursor-not-allowed"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs",
                  step === 2
                    ? "bg-[var(--color-primary)] text-white ring-4 ring-[#FF7F00]/20"
                    : step > 2
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-500 border border-gray-200"
                )}
              >
                {step > 2 ? "✓" : "2"}
              </div>
              <span className={cn("text-[11px] font-semibold transition-colors", step === 2 ? "text-[var(--color-primary)]" : "text-gray-500")}>
                Adresse
              </span>
            </button>

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => {
                if (deliveryMode === 'delivery' && !deliveryAddress.trim()) {
                  toast.error("Veuillez renseigner votre adresse à l'étape 2");
                  setStep(2);
                  return;
                }
                setStep(3);
              }}
              className="relative z-10 flex flex-col items-center gap-1 group focus:outline-none"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs",
                  step === 3
                    ? "bg-[var(--color-primary)] text-white ring-4 ring-[#FF7F00]/20"
                    : "bg-gray-100 text-gray-500 border border-gray-200"
                )}
              >
                3
              </div>
              <span className={cn("text-[11px] font-semibold transition-colors", step === 3 ? "text-[var(--color-primary)]" : "text-gray-500")}>
                Paiement
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        {/* ================= ÉTAPE 1 : ARTICLES & MODE DE RÉCEPTION ================= */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-4"
          >
            {/* Products Card */}
            {isCartMode ? (
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <Card key={item.id} elevation={2} padding="md">
                    <div className="flex items-center gap-3">
                      {item.listing_photo ? (
                        <div className="w-14 h-14 flex-shrink-0 rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-surface-variant)]">
                          <img
                            src={item.listing_photo}
                            alt={item.listing_title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 flex-shrink-0 rounded-[var(--radius-md)] bg-[var(--color-surface-variant)] flex items-center justify-center">
                          <ShoppingBag className="h-6 w-6 text-[var(--color-on-surface-variant)] opacity-40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h2 className="text-[14px] font-semibold text-[var(--color-on-surface)] leading-tight line-clamp-2">
                          {item.listing_title}
                        </h2>
                        <p className="text-[13px] text-[var(--color-on-surface-variant)] mt-1">
                          {item.quantity} × {formatPrice(item.listing_price)}
                        </p>
                      </div>
                      <p className="text-[17px] font-bold text-[var(--color-primary)] flex-shrink-0">
                        {formatPrice(item.listing_price * item.quantity)}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card elevation={2} padding="md">
                <div className="flex items-center gap-4">
                  {photoUrl ? (
                    <div className="w-20 h-20 flex-shrink-0 rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-surface-variant)]">
                      <img
                        src={photoUrl}
                        alt={listing!.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 flex-shrink-0 rounded-[var(--radius-md)] bg-[var(--color-surface-variant)] flex items-center justify-center">
                      <ShoppingBag className="h-8 w-8 text-[var(--color-on-surface-variant)] opacity-40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[15px] font-semibold text-[var(--color-on-surface)] leading-tight line-clamp-2">
                      {listing!.title}
                    </h2>
                    {listing!.original_price != null && listing!.original_price > listing!.price && (
                      <span className="text-xs text-[var(--color-on-surface-variant)] line-through mt-1 block">
                        {formatPrice(listing!.original_price)}
                      </span>
                    )}
                    <p className="text-[20px] font-bold text-[var(--color-primary)] mt-1">
                      {formatPrice(listing!.price)}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Choix du mode de réception */}
            <Card elevation={2} padding="md" className="space-y-3 border border-outline">
              <div className="flex items-center gap-2 font-bold text-sm text-[var(--color-on-surface)]">
                <Truck size={18} className="text-primary" />
                <span>Mode de réception</span>
              </div>

              {isSellerPro ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!sellerSettings.home_delivery_enabled}
                    onClick={() => {
                      setDeliveryMode('delivery');
                      if (paymentMethod === 'cash_at_shop') setPaymentMethod('online');
                    }}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.98]",
                      !sellerSettings.home_delivery_enabled
                        ? "opacity-50 cursor-not-allowed bg-gray-100 border-gray-200"
                        : deliveryMode === 'delivery'
                          ? "border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20"
                          : "border-outline bg-surface text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Livraison à domicile</span>
                      <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", deliveryMode === 'delivery' ? "border-primary bg-primary text-white" : "border-gray-300")}>
                        {deliveryMode === 'delivery' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-500 mt-1">
                      {sellerSettings.home_delivery_enabled ? "Expédition par livreur" : "Non proposé par le vendeur"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMode('pickup');
                      if (paymentMethod === 'cod') setPaymentMethod('cash_at_shop');
                    }}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.98]",
                      deliveryMode === 'pickup'
                        ? "border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20"
                        : "border-outline bg-surface text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Retrait en boutique</span>
                      <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", deliveryMode === 'pickup' ? "border-primary bg-primary text-white" : "border-gray-300")}>
                        {deliveryMode === 'pickup' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-green-700 font-medium mt-1">Gratuit (0 FCFA)</span>
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl border border-primary bg-primary/5 text-primary shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold block">Livraison à domicile</span>
                    <span className="text-[11px] text-gray-500 mt-0.5 block">Expédition sécurisée par DaloaDelivery</span>
                  </div>
                  <div className="w-4 h-4 rounded-full border border-primary bg-primary text-white flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                </div>
              )}
            </Card>

            <Button
              variant="filled"
              color="primary"
              size="lg"
              fullWidth
              onClick={handleStep1Next}
              className="mt-4"
            >
              Continuer →
            </Button>
          </motion.div>
        )}

        {/* ================= ÉTAPE 2 : ADRESSE & GÉOLOCALISATION ================= */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            <Card elevation={2} className="overflow-hidden space-y-3 p-4">
              <div className="flex items-center gap-2 font-bold text-sm text-[var(--color-on-surface)] mb-1">
                <MapPin size={18} className="text-primary" />
                <span>Adresse & Repère de livraison</span>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                <LocationPicker
                  initialLat={deliveryLatitude}
                  initialLng={deliveryLongitude}
                  onLocationChange={(lat, lng) => {
                    setDeliveryLatitude(lat);
                    setDeliveryLongitude(lng);
                  }}
                  placeholder="Cliquez sur la carte pour affiner la position"
                  className="w-full h-52 bg-gray-100"
                />
                <div className="absolute top-3 left-3 z-[400] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 pointer-events-none">
                  <MapPin className="h-4 w-4 text-[var(--color-primary)]" />
                  <span className="text-[12px] font-bold text-gray-800">Point sur la carte Daloa</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">
                  Précisions d'adresse <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => {
                    setDeliveryAddress(e.target.value);
                    if (addressError) setAddressError(false);
                  }}
                  placeholder="Exemple : Quartier Tazibouo, près de la pharmacie, maison portail bleu..."
                  rows={3}
                  className={`w-full px-4 py-3 text-[14px] border rounded-xl resize-none focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    addressError
                      ? "border-red-500 focus:ring-red-500 bg-red-50/30 placeholder:text-red-300"
                      : "border-gray-200 focus:ring-[var(--color-primary)] placeholder:text-gray-400 bg-gray-50"
                  }`}
                />
                {addressError && (
                  <p className="text-xs text-red-600 font-medium">Veuillez spécifier votre quartier ou repère.</p>
                )}
              </div>
            </Card>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outlined"
                color="secondary"
                size="lg"
                onClick={() => setStep(1)}
                className="w-1/3"
              >
                ← Retour
              </Button>
              <Button
                variant="filled"
                color="primary"
                size="lg"
                onClick={handleStep2Next}
                className="w-2/3"
              >
                Continuer →
              </Button>
            </div>
          </motion.div>
        )}

        {/* ================= ÉTAPE 3 : PAIEMENT & CONFIRMATION ================= */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            {/* Détail des frais */}
            <Card elevation={2} className="!p-0 overflow-hidden border border-[var(--color-outline)]">
              <div className="p-4 bg-gray-50/50 border-b border-[var(--color-outline)] flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[var(--color-primary)]" />
                <span className="text-[15px] font-semibold text-[var(--color-on-surface)]">Récapitulatif & Frais</span>
              </div>

              <div className="p-4 space-y-4 bg-white">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] text-gray-600">
                      {isCartMode ? `Produits (${cartItems.length})` : "Produit"}
                    </span>
                    <span className="text-[15px] font-medium text-gray-900">
                      {formatPrice(productAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-gray-400" />
                      <span className="text-[14px] text-gray-600">
                        {isPickup ? "Retrait en boutique" : "Livraison & Frais"}
                      </span>
                      {!isPickup && (
                        <span className="group relative cursor-help">
                          <Info className="h-3.5 w-3.5 text-gray-400 opacity-70" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-gray-900 text-white text-[11px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 leading-relaxed pointer-events-none">
                            Livraison : {formatPrice(deliveryFee)} (base {DELIVERY_MIN} FCFA, puis {DELIVERY_RATE_PER_KM} FCFA/km au-delà de {DELIVERY_FREE_KM} km
                            {distanceKm > 0 ? ` × ${distanceKm} km` : ''}) + Frais {(BUYER_FEE_RATE * 100)}% : {formatPrice(buyerFee)}
                          </span>
                        </span>
                      )}
                    </div>
                    <span className="text-[15px] font-medium text-gray-900">
                      {isPickup ? "Gratuit (0 FCFA)" : formatPrice(deliveryAndFees)}
                    </span>
                  </div>

                  {distanceKm > 0 && !isPickup && (
                    <div className="flex items-center gap-2 text-[12px] text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                      <Navigation className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                      <span>
                        Distance : <strong>{distanceKm} km</strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className="h-px bg-gray-100" />

                <div className="flex justify-between items-end pt-1">
                  <div>
                    <span className="text-[16px] font-bold text-gray-900 block">TOTAL à payer</span>
                    <span className="text-[11px] text-gray-500">Taxes incluses</span>
                  </div>
                  <span className="text-[24px] font-extrabold text-[var(--color-primary)]">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Choix du mode de paiement */}
            <Card elevation={2} padding="md" className="space-y-3 border border-outline">
              <div className="flex items-center gap-2 font-bold text-sm text-[var(--color-on-surface)]">
                <CreditCard size={18} className="text-primary" />
                <span>Mode de paiement</span>
              </div>

              <div className={cn("grid gap-2", (isSellerPro && (deliveryMode === 'pickup' || sellerSettings.cash_on_delivery_enabled)) ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('online')}
                  className={cn(
                    "p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.98]",
                    paymentMethod === 'online'
                      ? "border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20"
                      : "border-outline bg-surface text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Paiement en ligne</span>
                    <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", paymentMethod === 'online' ? "border-primary bg-primary text-white" : "border-gray-300")}>
                      {paymentMethod === 'online' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-500 mt-1">Mobile Money (MoneyFusion)</span>
                </button>

                {isSellerPro && deliveryMode === 'pickup' && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash_at_shop')}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.98]",
                      paymentMethod === 'cash_at_shop'
                        ? "border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20"
                        : "border-outline bg-surface text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Espèces au magasin</span>
                      <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", paymentMethod === 'cash_at_shop' ? "border-primary bg-primary text-white" : "border-gray-300")}>
                        {paymentMethod === 'cash_at_shop' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-amber-700 font-medium mt-1">Payer au vendeur au retrait</span>
                  </button>
                )}

                {isSellerPro && deliveryMode === 'delivery' && sellerSettings.cash_on_delivery_enabled && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.98]",
                      paymentMethod === 'cod'
                        ? "border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20"
                        : "border-outline bg-surface text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Paiement à la livraison</span>
                      <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", paymentMethod === 'cod' ? "border-primary bg-primary text-white" : "border-gray-300")}>
                        {paymentMethod === 'cod' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-amber-700 font-medium mt-1">Espèces au livreur affilié</span>
                  </button>
                )}
              </div>

              <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200 text-[11px] text-gray-600 leading-relaxed">
                {paymentMethod === 'online' && (
                  <p>🔒 <strong>Protection Acheteur :</strong> Votre argent est conservé en séquestre (Escrow) par MoneyFusion et vous est <strong>remboursé à 100%</strong> en cas d'annulation ou de non-livraison.</p>
                )}
                {paymentMethod === 'cod' && (
                  <p>🛵 <strong>Livreur Affilié :</strong> Cette livraison est assurée par le livreur personnel du vendeur. Remettez les espèces au livreur après avoir vérifié votre article.</p>
                )}
                {paymentMethod === 'cash_at_shop' && (
                  <p>🏪 <strong>Retrait en Boutique :</strong> Rendez-vous à la boutique du vendeur à Daloa pour vérifier l'article et régler directement en espèces sur place.</p>
                )}
              </div>
            </Card>

            {isCurfewActive() ? (
              <div className="bg-orange-50 rounded-[var(--radius-md)] px-4 py-3 flex items-start gap-2 border border-orange-200">
                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[13px] font-bold text-orange-900 leading-tight">
                    Livraisons suspendues (22h30 - 05h30)
                  </p>
                  <p className="text-[12px] text-orange-800 leading-relaxed">
                    Pour la sécurité de nos livreurs, les courses nocturnes sont suspendues. Votre commande sera traitée dès demain matin à 05h30.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[var(--color-primary-50)] rounded-[var(--radius-md)] px-4 py-3 flex items-start gap-2">
                <Info className="h-5 w-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-[var(--color-primary-700)] leading-relaxed">
                  {paymentMethod === 'cod'
                    ? "Commande privée Cash on Delivery : vous réglerez la totalité au livreur affilié du vendeur lors de la remise de votre colis."
                    : "Le paiement sera traité de manière sécurisée. Votre commande sera confirmée une fois le paiement validé."}
                </p>
              </div>
            )}

            {isSelfCheckout && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>Vous ne pouvez pas commander vos propres articles.</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outlined"
                color="secondary"
                size="lg"
                onClick={() => setStep(deliveryMode === 'pickup' ? 1 : 2)}
                className="w-1/3"
              >
                ← Retour
              </Button>
              <Button
                variant="filled"
                color="primary"
                size="lg"
                loading={paying}
                disabled={isSelfCheckout}
                icon={<CreditCard className="h-5 w-5" />}
                onClick={handlePay}
                className="w-2/3"
              >
                Payer maintenant
              </Button>
            </div>

            <div className="flex flex-col items-center gap-3 mt-4 pb-4">
              <p className="text-[12px] font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" /> Paiement 100% sécurisé
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 opacity-90 hover:opacity-100 transition-opacity">
                <img src="/Orange_logo.svg" alt="Orange Money" className="h-6 object-contain" />
                <img src="/MTN logo.jpeg" alt="MTN MoMo" className="h-6 rounded-md object-contain" />
                <img src="/wave-logo.png" alt="Wave" className="h-6 rounded-md object-contain" />
                <img src="/Visa_Inc._logo_(2021–present).svg" alt="Visa" className="h-4 object-contain" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5 object-contain" />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default CheckoutPage;
