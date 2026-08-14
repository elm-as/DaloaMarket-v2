import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
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
import type { ListingVariant } from "../types/listing";

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
  variants?: ListingVariant[];
}

const CheckoutPage: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSupabase();
  const { items: cartItems, clearCart, removeFromCart, updateQuantity } = useCart();
  usePageTitle("Commander");

  const isCartMode = !listingId || listingId === "cart";
  const requestedVariantId = !isCartMode && location.state && typeof location.state === 'object'
    ? (location.state as { variantId?: string }).variantId
    : undefined;

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
          .select("id, user_id, stock, status, title, variants, seller:users!listings_user_id_fkey(shop_latitude, shop_longitude, pro_until)")
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
          const dbMap = new Map<string, { stock: number; status: string; title: string; variants: ListingVariant[] }>();
          (data as any[]).forEach(item => {
            dbMap.set(item.id, {
              stock: item.stock ?? 0,
              status: item.status,
              title: item.title,
              variants: Array.isArray(item.variants) ? item.variants : [],
            });
          });

          for (const cartItem of cartItems) {
            const listing = dbMap.get(cartItem.listing_id);
            const selectedVariant = listing?.variants.find((variant) => variant.id === cartItem.variant_id);
            const availableStock = cartItem.variant_id ? (selectedVariant?.stock ?? 0) : (listing?.stock ?? 0);
            if (!listing || listing.status !== "active" || availableStock <= 0 || (cartItem.variant_id && !selectedVariant) || (listing.variants.length > 0 && !cartItem.variant_id)) {
              removeFromCart(cartItem.id);
              toast.error(
                `"${cartItem.listing_title}"${cartItem.variant_label ? ` (${cartItem.variant_label})` : ''} n'est plus disponible ou nécessite un choix de taille et a été retiré du panier`
              );
              hasInvalidItem = true;
            } else if (cartItem.quantity > availableStock) {
              updateQuantity(cartItem.id, availableStock, availableStock);
              toast(
                `Quantité de "${cartItem.listing_title}"${cartItem.variant_label ? ` (${cartItem.variant_label})` : ''} ajustée à ${availableStock}`,
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
        .select("id, title, price, photos, user_id, original_price, stock, status, variants, seller:users!listings_user_id_fkey(shop_latitude, shop_longitude, pro_until)")
        .eq("id", listingId)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const listingData = data as any;

      const listingVariants: ListingVariant[] = Array.isArray(listingData.variants) ? listingData.variants : [];
      const selectedVariant = listingVariants.find((variant) => variant.id === requestedVariantId);
      if (listingVariants.length > 0 && (!selectedVariant || selectedVariant.active === false || selectedVariant.stock <= 0)) {
        toast.error(requestedVariantId ? "Cette taille n'est plus disponible" : "Veuillez choisir une taille");
        navigate(`/listings/${listingData.id}`);
        return;
      }

      // Validate stock and status
      const availableStock = selectedVariant ? selectedVariant.stock : (listingData.stock ?? 0);
      if (listingData.status !== "active" || availableStock <= 0) {
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
        variants: listingVariants,
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

  const primaryCartItem = cartItems[0];
  const directSelectedVariant = !isCartMode
    ? listing?.variants?.find((variant) => variant.id === requestedVariantId)
    : undefined;
  const orderVariantId = isCartMode ? primaryCartItem?.variant_id : directSelectedVariant?.id;

  const orderQuantity = isCartMode ? primaryCartItem?.quantity : 1;

  const productAmount = isCartMode
    ? cartItems.reduce((sum, item) => sum + item.listing_price * item.quantity, 0)
    : (directSelectedVariant?.price ?? listing?.price ?? 0);

  const isPickup = deliveryMode === 'pickup';
  const pricing = calculateOrderPricing(productAmount, distanceKm, isSellerPro);
  const deliveryFee = isPickup ? 0 : pricing.delivery;
  const buyerFee = pricing.buyerFee;
  const deliveryAndFees = deliveryFee + buyerFee;
  const total = productAmount + deliveryAndFees;
  const paymentActionLabel =
    paymentMethod === 'cash_at_shop'
      ? 'Réserver en boutique'
      : paymentMethod === 'cod'
        ? `Commander · ${formatPrice(total)}`
        : `Payer ${formatPrice(total)}`;
  const isSelfCheckout = isCartMode ? isCartSelfCheckout : listing?.user_id === user?.id;

  const resolveOrderSelection = async (targetListingId: string, targetVariantId?: string, targetQuantity: number = 1) => {
    const { data, error } = await supabase
      .from('listings')
      .select('user_id, price, stock, variants')
      .eq('id', targetListingId)
      .single();

    if (error || !data) throw new Error("Impossible de trouver le vendeur de cet article");

    const variants: ListingVariant[] = Array.isArray((data as any).variants) ? (data as any).variants : [];
    const variant = targetVariantId ? variants.find((candidate) => candidate.id === targetVariantId) : undefined;
    const quantity = Math.max(1, targetQuantity);
    const availableStock = variant ? Number(variant.stock) || 0 : Number((data as any).stock) || 0;

    if (variants.length > 0 && (!variant || variant.active === false)) {
      throw new Error('La taille ou option sélectionnée n\'est plus disponible');
    }
    if (availableStock < quantity) {
      throw new Error('La quantité demandée n\'est plus disponible en stock');
    }

    return {
      sellerId: (data as any).user_id as string,
      variantId: variant?.id || null,
      variantLabel: variant?.label || null,
      unitPrice: variant?.price != null ? Number(variant.price) : Number((data as any).price),
      quantity,
    };
  };

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
        const itemsToProcess = isCartMode
          ? cartItems.map((ci) => ({ listingId: ci.listing_id, variantId: ci.variant_id, quantity: ci.quantity }))
          : [{ listingId: listing!.id, variantId: requestedVariantId, quantity: 1 }];

        for (const item of itemsToProcess) {
          const selection = await resolveOrderSelection(item.listingId, item.variantId, item.quantity);
          const itemProductAmount = selection.unitPrice * selection.quantity;
          const itemBuyerFee = Math.round(itemProductAmount * BUYER_FEE_RATE);
          const itemTotal = itemProductAmount + itemBuyerFee;

          const { error: orderErr } = await supabase
            .from("orders")
            .insert({
              buyer_id: user.id,
              seller_id: selection.sellerId,
              listing_id: item.listingId,
              variant_id: selection.variantId,
              variant_label: selection.variantLabel,
              unit_price: selection.unitPrice,
              quantity: selection.quantity,
              product_amount: itemProductAmount,
              delivery_fee: 0,
              platform_commission: itemBuyerFee,
              total_amount: itemTotal,
              delivery_address: "Retrait en boutique",
              delivery_mode: "pickup",
              payment_method: paymentMethod === 'cash_at_shop' ? "cash_at_shop" : "online",
              status: "pending_seller_confirmation",
            } as any);

          if (orderErr) {
            throw new Error(orderErr.message || "Erreur de création de la commande");
          }
        }

        if (isCartMode) clearCart();

        toast.success(
          itemsToProcess.length > 1
            ? "Vos réservations ont été enregistrées avec succès ! Vous réglerez chaque vendeur directement en boutique."
            : "Réservation enregistrée ! Vous réglerez le vendeur directement à la boutique."
        );
        navigate("/mes-commandes");
        return;
      }

      if (paymentMethod === 'cod') {
        const itemsToProcess = isCartMode
          ? cartItems.map((ci) => ({ listingId: ci.listing_id, variantId: ci.variant_id, quantity: ci.quantity }))
          : [{ listingId: listing!.id, variantId: requestedVariantId, quantity: 1 }];

        const perItemDeliveryFee = Math.round(deliveryFee / itemsToProcess.length);

        for (let i = 0; i < itemsToProcess.length; i++) {
          const item = itemsToProcess[i];
          const selection = await resolveOrderSelection(item.listingId, item.variantId, item.quantity);
          const itemProductAmount = selection.unitPrice * selection.quantity;
          const itemBuyerFee = Math.round(itemProductAmount * BUYER_FEE_RATE);
          const itemDelivery = i === 0 ? (deliveryFee - perItemDeliveryFee * (itemsToProcess.length - 1)) : perItemDeliveryFee;
          const itemTotal = itemProductAmount + itemBuyerFee + itemDelivery;

          const { data: orderData, error: orderErr } = await supabase
            .from("orders")
            .insert({
              buyer_id: user.id,
              seller_id: selection.sellerId,
              listing_id: item.listingId,
              variant_id: selection.variantId,
              variant_label: selection.variantLabel,
              unit_price: selection.unitPrice,
              quantity: selection.quantity,
              product_amount: itemProductAmount,
              delivery_fee: itemDelivery,
              platform_commission: itemBuyerFee,
              total_amount: itemTotal,
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

          const { error: assignErr } = await supabase
            .from("delivery_assignments")
            .insert({
              order_id: orderData.id,
              seller_id: selection.sellerId,
              is_private: true,
              status: "pending_seller_confirmation",
              delivery_price: itemDelivery,
              dropoff_location: deliveryAddress || "Daloa",
              pickup_otp: Math.floor(100000 + Math.random() * 900000).toString(),
              delivery_otp: Math.floor(100000 + Math.random() * 900000).toString(),
            } as any);

          if (assignErr) {
            console.error("Assignment creation error:", assignErr);
          }
        }

        if (isCartMode) clearCart();

        toast.success(
          itemsToProcess.length > 1
            ? "Vos commandes (Paiement à la livraison) ont été enregistrées ! Les vendeurs vont confirmer la disponibilité."
            : "Commande enregistrée (Paiement à la livraison) ! Le vendeur va confirmer la disponibilité."
        );
        navigate("/mes-commandes");
        return;
      }

      const { createOrder } = await import("../lib/payment");

      const processItem = async (targetListingId: string, targetVariantId?: string, targetQty: number = 1, targetAmount: number = total) => {
        const result = await createOrder({
          buyer_id: user.id,
          listing_id: targetListingId,
          variant_id: targetVariantId,
          quantity: targetQty,
          delivery_address: deliveryAddress || "Daloa",
          delivery_mode: "delivery",
          delivery_lat: deliveryLatitude,
          delivery_lng: deliveryLongitude,
          amount: targetAmount,
        });
        if (result.payment_url) {
          if (isCartMode) clearCart();
          window.location.href = result.payment_url;
        } else {
          throw new Error("Aucune URL de paiement reçue");
        }
      };

      if (isCartMode) {
        await processItem(
          cartItems[0].listing_id,
          cartItems[0].variant_id,
          cartItems.reduce((acc, i) => acc + i.quantity, 0),
          total
        );
      } else {
        await processItem(listing!.id, requestedVariantId, 1, total);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50/70">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isCartMode && cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50/70">
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 px-5 pt-6 pb-14 rounded-b-[36px] shadow-lg">
          <div className="absolute -top-12 -right-10 w-36 h-36 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <Link
              to="/panier"
              className="w-10 h-10 inline-flex items-center justify-center rounded-2xl bg-white/15 text-white hover:bg-white/25 active:scale-95 transition-all"
              aria-label="Retour au panier"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-100">
                DaloaMarket · commande
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Panier vide
              </h1>
            </div>
          </div>
        </div>
        <div className="relative z-10 -mt-7 mx-4 max-w-lg md:mx-auto">
          <Card className="rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 p-6">
            <EmptyState
              title="Votre panier est vide"
              description="Ajoutez des articles à votre panier avant de finaliser votre commande."
              action={{ label: "Voir les annonces", onClick: () => navigate("/") }}
            />
          </Card>
        </div>
      </div>
    );
  }

  if (!isCartMode && (notFound || !listing)) {
    return (
      <div className="min-h-screen bg-gray-50/70">
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 px-5 pt-6 pb-14 rounded-b-[36px] shadow-lg">
          <div className="absolute -top-12 -right-10 w-36 h-36 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <Link
              to="/"
              className="w-10 h-10 inline-flex items-center justify-center rounded-2xl bg-white/15 text-white hover:bg-white/25 active:scale-95 transition-all"
              aria-label="Retour à l'accueil"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-100">
                DaloaMarket · commande
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Annonce introuvable
              </h1>
            </div>
          </div>
        </div>
        <div className="relative z-10 -mt-7 mx-4 max-w-lg md:mx-auto">
          <Card className="rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 p-6">
            <EmptyState
              title="Article indisponible"
              description="Cette annonce n'existe pas ou a été retirée de la vente."
              action={{ label: "Retour aux annonces", onClick: () => navigate("/") }}
            />
          </Card>
        </div>
      </div>
    );
  }

  const photoUrl = listing?.photos?.[0] || "";

  return (
    <motion.div
      className="min-h-screen bg-gray-50/70 pb-safe pb-28"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* ── HERO BANNER ── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 px-5 pt-6 pb-16 rounded-b-[36px] shadow-lg">
        <div className="absolute -top-12 -right-10 h-36 w-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-14 -left-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleHeaderBack}
              className="w-10 h-10 inline-flex flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white transition-all hover:bg-white/25 active:scale-95"
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-100">
                Commande 100% sécurisée
              </p>
              <h1 className="truncate text-xl font-extrabold tracking-tight text-white">
                {isCartMode ? "Finaliser votre commande" : "Finaliser votre achat"}
              </h1>
            </div>
          </div>
          <span className="flex-shrink-0 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-extrabold text-white border border-white/20">
            Étape {step}/3
          </span>
        </div>
      </header>

      {/* ── FLOATING MODERN STEPPER ── */}
      <div className="relative z-20 -mt-8 max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-3xl p-3 border border-gray-100 shadow-lg shadow-gray-200/50">
          <div className="relative flex items-center justify-between px-3">
            {/* Background connecting bar */}
            <div className="absolute top-1/2 left-8 right-8 h-1 bg-gray-100 -translate-y-1/2 z-0 rounded-full" />
            <div
              className="absolute top-1/2 left-8 h-1 bg-gradient-to-r from-orange-500 to-amber-600 -translate-y-1/2 z-0 rounded-full transition-all duration-300 origin-left"
              style={{
                width: step === 1 ? '0%' : step === 2 ? '50%' : 'calc(100% - 4rem)',
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
                  "w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold transition-all shadow-sm",
                  step === 1
                    ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white ring-4 ring-orange-500/20 shadow-orange-500/30"
                    : step > 1
                    ? "bg-emerald-500 text-white shadow-emerald-500/20"
                    : "bg-white text-gray-400 border border-gray-200"
                )}
              >
                {step > 1 ? "✓" : "1"}
              </div>
              <span className={cn("text-[11px] font-bold transition-colors", step === 1 ? "text-orange-600" : step > 1 ? "text-gray-800" : "text-gray-400")}>
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
                  "w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold transition-all shadow-sm",
                  step === 2
                    ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white ring-4 ring-orange-500/20 shadow-orange-500/30"
                    : step > 2
                    ? "bg-emerald-500 text-white shadow-emerald-500/20"
                    : "bg-white text-gray-400 border border-gray-200"
                )}
              >
                {step > 2 ? "✓" : "2"}
              </div>
              <span className={cn("text-[11px] font-bold transition-colors", step === 2 ? "text-orange-600" : step > 2 ? "text-gray-800" : "text-gray-400")}>
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
                  "w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold transition-all shadow-sm",
                  step === 3
                    ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white ring-4 ring-orange-500/20 shadow-orange-500/30"
                    : "bg-white text-gray-400 border border-gray-200"
                )}
              >
                3
              </div>
              <span className={cn("text-[11px] font-bold transition-colors", step === 3 ? "text-orange-600" : "text-gray-400")}>
                Paiement
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── STEP CONTENT ── */}
      <div className="px-4 py-5 space-y-4 max-w-3xl mx-auto">
        {/* ================= ÉTAPE 1 : ARTICLES & MODE DE RÉCEPTION ================= */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Products Card */}
            {isCartMode ? (
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl p-4 border border-gray-100 shadow-lg shadow-gray-200/50 flex items-center gap-3.5"
                  >
                    <div className="w-16 h-16 flex-shrink-0 rounded-2xl overflow-hidden bg-orange-50/50 border border-orange-100/50">
                      {item.listing_photo ? (
                        <img
                          src={item.listing_photo}
                          alt={item.listing_title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-6 w-6 text-orange-400 opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-extrabold text-gray-900 leading-snug line-clamp-2">
                        {item.listing_title}
                      </h2>
                      <p className="text-xs font-semibold text-gray-500 mt-1">
                        {item.quantity} × {formatPrice(item.listing_price)}
                      </p>
                      {item.variant_label && (
                        <span className="inline-block px-2 py-0.5 mt-1 rounded-lg bg-orange-50 text-[10px] font-extrabold text-orange-700 border border-orange-200/50">
                          Taille : {item.variant_label}
                        </span>
                      )}
                    </div>
                    <p className="text-base font-black text-orange-600 flex-shrink-0 tabular-nums">
                      {formatPrice(item.listing_price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-lg shadow-gray-200/50 flex items-center gap-4">
                <div className="w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden bg-orange-50/50 border border-orange-100/50">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={listing!.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="h-8 w-8 text-orange-400 opacity-40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[15px] font-extrabold text-gray-900 leading-snug line-clamp-2">
                    {listing!.title}
                  </h2>
                  {listing!.original_price != null && listing!.original_price > listing!.price && (
                    <span className="text-xs text-gray-400 line-through mt-0.5 block font-medium">
                      {formatPrice(listing!.original_price)}
                    </span>
                  )}
                  <p className="text-lg font-black text-orange-600 mt-1 tabular-nums">
                    {formatPrice(directSelectedVariant?.price ?? listing!.price)}
                  </p>
                  {directSelectedVariant && (
                    <span className="inline-block px-2 py-0.5 mt-1 rounded-lg bg-orange-50 text-[10px] font-extrabold text-orange-700 border border-orange-200/50">
                      Taille : {directSelectedVariant.label}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Choix du mode de réception */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-lg shadow-gray-200/50 space-y-3.5">
              <div className="flex items-center gap-2 font-extrabold text-sm text-gray-900">
                <div className="w-7 h-7 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Truck size={16} />
                </div>
                <span>Mode de réception</span>
              </div>

              {isSellerPro ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Livraison */}
                  <button
                    type="button"
                    disabled={!sellerSettings.home_delivery_enabled}
                    onClick={() => {
                      setDeliveryMode('delivery');
                      if (paymentMethod === 'cash_at_shop') setPaymentMethod('online');
                    }}
                    className={cn(
                      "p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all active:scale-[0.98]",
                      !sellerSettings.home_delivery_enabled
                        ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200"
                        : deliveryMode === 'delivery'
                          ? "border-orange-500 bg-orange-50/40 text-orange-950 shadow-sm ring-2 ring-orange-500/10"
                          : "border-gray-100 bg-white text-gray-700 hover:border-gray-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold">Livraison à domicile</span>
                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", deliveryMode === 'delivery' ? "border-orange-500 bg-orange-500 text-white" : "border-gray-300")}>
                        {deliveryMode === 'delivery' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-500 mt-2 font-medium">
                      {sellerSettings.home_delivery_enabled ? "Expédition rapide par livreur" : "Non proposé par le vendeur"}
                    </span>
                  </button>

                  {/* Option 2: Retrait en boutique */}
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMode('pickup');
                      if (paymentMethod === 'cod') setPaymentMethod('cash_at_shop');
                    }}
                    className={cn(
                      "p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all active:scale-[0.98]",
                      deliveryMode === 'pickup'
                        ? "border-orange-500 bg-orange-50/40 text-orange-950 shadow-sm ring-2 ring-orange-500/10"
                        : "border-gray-100 bg-white text-gray-700 hover:border-gray-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold">Retrait en boutique</span>
                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", deliveryMode === 'pickup' ? "border-orange-500 bg-orange-500 text-white" : "border-gray-300")}>
                        {deliveryMode === 'pickup' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-extrabold mt-2">Gratuit (0 FCFA) · Click & Collect</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border-2 border-orange-500/30 bg-orange-50/40 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-gray-900 block">Livraison locale à domicile</span>
                    <span className="text-[11px] text-gray-500 mt-0.5 block font-medium">Expédition sécurisée partout à Daloa</span>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 border-orange-500 bg-orange-500 text-white flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="filled"
              color="primary"
              size="lg"
              fullWidth
              onClick={handleStep1Next}
              className="mt-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-extrabold shadow-lg shadow-orange-500/25 active:scale-[0.98]"
            >
              Continuer vers l'adresse →
            </Button>
          </motion.div>
        )}

        {/* ================= ÉTAPE 2 : ADRESSE & GÉOLOCALISATION ================= */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-lg shadow-gray-200/50 space-y-4">
              <div className="flex items-center gap-2 font-extrabold text-sm text-gray-900">
                <div className="w-7 h-7 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <MapPin size={16} />
                </div>
                <span>Adresse & Repère de livraison à Daloa</span>
              </div>

              {/* Map Container */}
              <div className="relative rounded-3xl overflow-hidden border border-gray-200 shadow-inner">
                <LocationPicker
                  initialLat={deliveryLatitude}
                  initialLng={deliveryLongitude}
                  onLocationChange={(lat, lng) => {
                    setDeliveryLatitude(lat);
                    setDeliveryLongitude(lng);
                  }}
                  placeholder="Cliquez sur la carte pour affiner la position"
                  className="w-full h-56 bg-gray-100"
                />
                <div className="absolute top-3 left-3 z-[400] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md flex items-center gap-2 pointer-events-none border border-white/40">
                  <MapPin className="h-3.5 w-3.5 text-orange-600" />
                  <span className="text-[11px] font-extrabold text-gray-800">Point de livraison Daloa</span>
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-700">
                  Précisions d'adresse & Quartier <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => {
                    setDeliveryAddress(e.target.value);
                    if (addressError) setAddressError(false);
                  }}
                  placeholder="Exemple : Quartier Tazibouo, près de la pharmacie, maison portail bleu..."
                  rows={3}
                  className={cn(
                    "w-full px-4 py-3 text-sm border-2 rounded-2xl resize-none focus:outline-none transition-all placeholder:text-gray-400 font-medium",
                    addressError
                      ? "border-red-400 focus:ring-4 focus:ring-red-500/10 bg-red-50/20"
                      : "border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 bg-gray-50/50"
                  )}
                />
                {addressError && (
                  <p className="text-xs text-red-600 font-bold mt-1">Veuillez spécifier votre quartier ou repère.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outlined"
                color="secondary"
                size="lg"
                onClick={() => setStep(1)}
                className="w-1/3 rounded-2xl font-extrabold"
              >
                ← Retour
              </Button>
              <Button
                variant="filled"
                color="primary"
                size="lg"
                onClick={handleStep2Next}
                className="w-2/3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-extrabold shadow-lg shadow-orange-500/25 active:scale-[0.98]"
              >
                Continuer vers le paiement →
              </Button>
            </div>
          </motion.div>
        )}

        {/* ================= ÉTAPE 3 : PAIEMENT & CONFIRMATION ================= */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Détail des frais */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 overflow-hidden">
              <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <CreditCard className="h-4 w-4" />
                </div>
                <span className="text-sm font-extrabold text-gray-900">Récapitulatif & Frais</span>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center text-gray-600 font-medium">
                    <span>
                      {isCartMode ? `Articles (${cartItems.length})` : "Prix article"}
                    </span>
                    <span className="font-extrabold text-gray-900 tabular-nums">
                      {formatPrice(productAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-gray-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-gray-400" />
                      <span>
                        {isPickup ? "Retrait en boutique" : "Livraison"}
                      </span>
                      {!isPickup && (
                        <span className="group relative cursor-help">
                          <Info className="h-3.5 w-3.5 text-gray-400 opacity-70" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-gray-900 text-white text-[11px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 leading-relaxed pointer-events-none shadow-lg">
                            Livraison : {formatPrice(deliveryFee)} (base {DELIVERY_MIN} FCFA, puis {DELIVERY_RATE_PER_KM} FCFA/km au-delà de {DELIVERY_FREE_KM} km
                            {distanceKm > 0 ? ` × ${distanceKm} km` : ''}) + Frais {(BUYER_FEE_RATE * 100)}% : {formatPrice(buyerFee)}
                          </span>
                        </span>
                      )}
                    </div>
                    <span className="font-extrabold text-gray-900 tabular-nums">
                      {isPickup ? "Gratuit (0 FCFA)" : formatPrice(deliveryFee)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-gray-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-emerald-600" />
                      <span>Protection acheteur Escrow ({BUYER_FEE_RATE * 100}%)</span>
                    </div>
                    <span className="font-extrabold text-gray-900 tabular-nums">{formatPrice(buyerFee)}</span>
                  </div>

                  {distanceKm > 0 && !isPickup && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 font-medium">
                      <Navigation className="h-3.5 w-3.5 text-orange-600" />
                      <span>
                        Distance estimée : <strong>{distanceKm} km</strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className="h-px bg-gray-100" />

                <div className="flex justify-between items-end pt-1">
                  <div>
                    <span className="text-sm font-bold text-gray-500 block uppercase tracking-wider">TOTAL À PAYER</span>
                    <span className="text-[11px] text-gray-400 font-medium">Toutes taxes incluses</span>
                  </div>
                  <span className="text-2xl font-black text-orange-600 tabular-nums">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Choix du mode de paiement */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-lg shadow-gray-200/50 space-y-4">
              <div className="flex items-center gap-2 font-extrabold text-sm text-gray-900">
                <div className="w-7 h-7 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <CreditCard size={16} />
                </div>
                <span>Mode de paiement</span>
              </div>

              <div className={cn("grid gap-3", (isSellerPro && (deliveryMode === 'pickup' || sellerSettings.cash_on_delivery_enabled)) ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('online')}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all active:scale-[0.98]",
                    paymentMethod === 'online'
                      ? "border-orange-500 bg-orange-50/40 text-orange-950 shadow-sm ring-2 ring-orange-500/10"
                      : "border-gray-100 bg-white text-gray-700 hover:border-gray-200"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold">Paiement Mobile Money</span>
                    <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", paymentMethod === 'online' ? "border-orange-500 bg-orange-500 text-white" : "border-gray-300")}>
                      {paymentMethod === 'online' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-500 mt-2 font-medium">Wave, Orange Money, MTN MoMo, Moov</span>
                </button>

                {isSellerPro && deliveryMode === 'pickup' && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash_at_shop')}
                    className={cn(
                      "p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all active:scale-[0.98]",
                      paymentMethod === 'cash_at_shop'
                        ? "border-orange-500 bg-orange-50/40 text-orange-950 shadow-sm ring-2 ring-orange-500/10"
                        : "border-gray-100 bg-white text-gray-700 hover:border-gray-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold">Espèces au magasin</span>
                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", paymentMethod === 'cash_at_shop' ? "border-orange-500 bg-orange-500 text-white" : "border-gray-300")}>
                        {paymentMethod === 'cash_at_shop' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-amber-700 font-extrabold mt-2">Payer directement au vendeur sur place</span>
                  </button>
                )}

                {isSellerPro && deliveryMode === 'delivery' && sellerSettings.cash_on_delivery_enabled && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={cn(
                      "p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all active:scale-[0.98]",
                      paymentMethod === 'cod'
                        ? "border-orange-500 bg-orange-50/40 text-orange-950 shadow-sm ring-2 ring-orange-500/10"
                        : "border-gray-100 bg-white text-gray-700 hover:border-gray-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold">Paiement à la livraison</span>
                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", paymentMethod === 'cod' ? "border-orange-500 bg-orange-500 text-white" : "border-gray-300")}>
                        {paymentMethod === 'cod' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-amber-700 font-extrabold mt-2">Espèces au livreur affilié du vendeur</span>
                  </button>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-100 text-xs text-orange-950 leading-relaxed font-medium">
                {paymentMethod === 'online' && (
                  <p>🔒 <strong>Protection Acheteur Escrow :</strong> Votre argent est sécurisé sous séquestre par MoneyFusion et vous est <strong>remboursé à 100%</strong> en cas d'annulation ou de non-livraison.</p>
                )}
                {paymentMethod === 'cod' && (
                  <p>🛵 <strong>Livreur Affilié :</strong> Cette livraison est assurée par le livreur personnel du vendeur. Remettez les espèces au livreur après vérification du colis.</p>
                )}
                {paymentMethod === 'cash_at_shop' && (
                  <p>🏪 <strong>Retrait en Boutique :</strong> Rendez-vous à la boutique du vendeur à Daloa pour vérifier l'article et régler sur place en espèces.</p>
                )}
              </div>
            </div>

            {isCurfewActive() ? (
              <div className="bg-amber-50 rounded-2xl p-4 flex items-start gap-3 border border-amber-200 shadow-sm">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-900">
                    Courses nocturnes suspendues (22h30 - 05h30)
                  </p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Pour la sécurité des livreurs, les livraisons reprendront demain matin dès 05h30.
                  </p>
                </div>
              </div>
            ) : null}

            {isSelfCheckout && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-start gap-2">
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
                className="w-1/3 rounded-2xl font-extrabold"
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
                className="w-2/3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-extrabold shadow-lg shadow-orange-500/25 active:scale-[0.98]"
              >
                {paymentActionLabel}
              </Button>
            </div>

            <div className="flex flex-col items-center gap-3 mt-4 pb-4">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                Paiement certifié & garanti à Daloa
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 opacity-80">
                <img src="/Orange_logo.svg" alt="Orange Money" className="h-5 object-contain" />
                <img src="/MTN logo.jpeg" alt="MTN MoMo" className="h-5 rounded-md object-contain" />
                <img src="/wave-logo.png" alt="Wave" className="h-5 rounded-md object-contain" />
                <img src="/Visa_Inc._logo_(2021–present).svg" alt="Visa" className="h-3.5 object-contain" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4 object-contain" />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default CheckoutPage;
