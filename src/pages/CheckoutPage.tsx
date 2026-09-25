import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ShoppingBag,
  Truck,
  Shield,
  ShieldCheck,
  CreditCard,
  Banknote,
  Store,
  MapPin,
  Info,
  ChevronRight,
  Navigation,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useCart } from "../contexts/CartContext";
import { supabase } from "../lib/supabase";
import { useSupabase } from "../hooks/useSupabase";
import { useSystemSettings } from "../hooks/useSystemSettings";
import { usePageTitle } from "../hooks/usePageTitle";
import { isCurfewActive } from "../utils/timeConstraints";
import { formatPrice, cn, isLocationInDaloa } from "../lib/utils";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { EmptyState } from "../components/ui/EmptyState";
import { LocationPicker } from "../components/ui/LocationPicker";
import {
  calculateOrderPricing,
  BUYER_FEE_RATE,
  DELIVERY_MIN,
  DELIVERY_RATE_PER_KM,
  DELIVERY_FREE_KM,
} from "../lib/pricing";
import type { LatLng } from "../lib/pricing";
import {
  resolveSellerPoint,
  resolveBuyerPoint,
  resolveBillableDistanceKm,
} from "../lib/daloaGeo";
import { calculateDeliveryFee } from "../lib/delivery";
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
  seller_district: string | null;
  is_seller_pro?: boolean;
  variants?: ListingVariant[];
}

const CheckoutPage: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSupabase();
  const { phaseConfig } = useSystemSettings();
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
  // Itinéraire en cours de calcul (Mapbox puis OSRM : jusqu'à quelques secondes).
  const [routing, setRouting] = useState(false);
  const [cartSellers, setCartSellers] = useState<Map<string, { sellerId: string; lat: number; lng: number; isPro?: boolean }>>(new Map());
  /* Frais de livraison par VENDEUR : le serveur en facture un par vendeur
     (payments.js), le checkout n'en affichait qu'un seul, calculé sur la
     distance maximale. Un panier chez deux vendeurs affichait 500 et en
     facturait 1 000. */
  const [deliveryFeesBySeller, setDeliveryFeesBySeller] = useState<Map<string, number>>(new Map());
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

  // Livraison à Daloa uniquement. Hors zone, le tarif n'a pas de sens : on
  // bloque au lieu d'afficher un prix calculé depuis le centre-ville.
  const isOutOfZone =
    deliveryMode === 'delivery' &&
    deliveryLatitude != null &&
    deliveryLongitude != null &&
    !isLocationInDaloa(deliveryLatitude, deliveryLongitude);
  const OUT_OF_ZONE_MESSAGE = 'Nous livrons uniquement à Daloa. Placez le repère sur votre adresse à Daloa.';

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
    if (deliveryMode === 'delivery' && (deliveryLatitude == null || deliveryLongitude == null || isNaN(deliveryLatitude) || isNaN(deliveryLongitude))) {
      toast.error("Veuillez positionner votre adresse sur la carte ou activer votre GPS.");
      return;
    }
    if (isOutOfZone) {
      toast.error(OUT_OF_ZONE_MESSAGE);
      return;
    }
    setStep(3);
  };

  const buyerCoords: LatLng | null =
    deliveryLatitude != null && deliveryLongitude != null
      ? { latitude: deliveryLatitude, longitude: deliveryLongitude }
      : null;

  /* L'ancien « repli » sur listing.latitude/longitude n'en était pas un : ces
     champs reçoivent déjà shop_latitude/shop_longitude. Sans GPS boutique,
     sellerCoords valait null, la distance tombait à 0 km et la livraison
     s'affichait à 500 FCFA pendant que le serveur facturait la vraie distance. */
  const sellerCoords: LatLng | null = listing
    ? resolveSellerPoint({
        shop_latitude: listing.seller_shop_latitude,
        shop_longitude: listing.seller_shop_longitude,
        district: listing.seller_district,
      })
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
          .select("id, user_id, stock, status, title, variants, seller:users!listings_user_id_fkey(shop_latitude, shop_longitude, district, pro_until)")
          .in("id", sellerIds);

        if (!error && data) {
          const sellerMap = new Map<string, { sellerId: string; lat: number; lng: number; isPro?: boolean }>();
          let hasSelfItem = false;
          let hasInvalidItem = false;

          (data as any[]).forEach(item => {
            if (item.user_id === user?.id) hasSelfItem = true;
            const isPro = item.seller?.pro_until ? new Date(item.seller.pro_until) > new Date() : false;
            // Un vendeur sans GPS n'était tout simplement pas inscrit ici, donc
            // ignoré dans le calcul de distance. Il a désormais un point de repli.
            const point = resolveSellerPoint({
              shop_latitude: item.seller?.shop_latitude,
              shop_longitude: item.seller?.shop_longitude,
              district: item.seller?.district,
            });
            sellerMap.set(item.id, {
              sellerId: item.user_id,
              lat: point.latitude,
              lng: point.longitude,
              isPro,
            });
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
        .select("id, title, price, photos, user_id, original_price, stock, status, variants, seller:users!listings_user_id_fkey(shop_latitude, shop_longitude, district, pro_until)")
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
        seller_district: listingData.seller?.district ?? null,
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

  /* Distance routière réelle (Mapbox, repli OSRM puis vol d'oiseau × 1,3), et
     un frais par vendeur — c'est ce que facture le serveur. L'ancien calcul
     retenait la distance MAXIMALE du panier pour un frais unique. */
  useEffect(() => {
    let active = true;

    const compute = async () => {
      const buyerPoint = resolveBuyerPoint(buyerCoords, null);

      if (isCartMode) {
        const bySeller = new Map<string, { latitude: number; longitude: number }>();
        cartSellers.forEach((seller) => {
          if (!bySeller.has(seller.sellerId)) {
            bySeller.set(seller.sellerId, { latitude: seller.lat, longitude: seller.lng });
          }
        });

        if (bySeller.size === 0) {
          if (active) {
            setDistanceKm(0);
            setDeliveryFeesBySeller(new Map());
          }
          return;
        }

        const fees = new Map<string, number>();
        let maxKm = 0;
        for (const [sellerId, point] of bySeller.entries()) {
          const km = await resolveBillableDistanceKm(point, buyerPoint);
          fees.set(sellerId, calculateDeliveryFee(km));
          if (km > maxKm) maxKm = km;
        }

        if (active) {
          setDistanceKm(maxKm);
          setDeliveryFeesBySeller(fees);
        }
        return;
      }

      if (!sellerCoords || !listing) {
        if (active) {
          setDistanceKm(0);
          setDeliveryFeesBySeller(new Map());
        }
        return;
      }

      const km = await resolveBillableDistanceKm(sellerCoords, buyerPoint);
      if (active) {
        setDistanceKm(km);
        setDeliveryFeesBySeller(new Map([[listing.user_id, calculateDeliveryFee(km)]]));
      }
    };

    // Petite attente : glisser le repère ne relance pas un calcul à chaque pixel.
    setRouting(true);
    const timer = setTimeout(() => {
      compute().finally(() => {
        if (active) setRouting(false);
      });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    buyerCoords?.latitude,
    buyerCoords?.longitude,
    sellerCoords?.latitude,
    sellerCoords?.longitude,
    listing?.user_id,
    isCartMode,
    cartSellers,
  ]);

  const isSellerPro = isCartMode
    ? (cartItems.length > 0 && cartItems.every(item => cartSellers.get(item.listing_id)?.isPro === true))
    : (listing?.is_seller_pro ?? false);

  // Même règle que create_cod_order : Pro, ou phase qui l'ouvre à tous. Le
  // réglage personnel du vendeur l'ouvrait à tort en phase 1 (règle en « ou »).
  const isCodAllowed = isSellerPro || phaseConfig.allow_cod_for_all;
  const isPickupAllowed = isSellerPro || phaseConfig.allow_pickup_for_all;

  useEffect(() => {
    if (!isPickupAllowed && deliveryMode === 'pickup') {
      setDeliveryMode('delivery');
    }
    if (!isCodAllowed && paymentMethod === 'cod') {
      setPaymentMethod('online');
    }
    if (!isPickupAllowed && paymentMethod === 'cash_at_shop') {
      setPaymentMethod('online');
    }
  }, [isSellerPro, isPickupAllowed, isCodAllowed, deliveryMode, paymentMethod]);

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
  const sumOfSellerFees = Array.from(deliveryFeesBySeller.values()).reduce((sum, fee) => sum + fee, 0);
  // Un frais par vendeur, comme le serveur. Tant que les distances ne sont pas
  // encore revenues, on retombe sur la grille appliquée à la distance affichée.
  const deliveryFee = isPickup ? 0 : sumOfSellerFees || pricing.delivery;
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

  const handlePay = async () => {
    if (!user) return;

    if (deliveryMode === 'delivery' && !deliveryAddress.trim()) {
      setAddressError(true);
      toast.error("Veuillez renseigner une adresse de livraison (Quartier, repère, etc.)");
      return;
    }

    if (deliveryMode === 'delivery' && (deliveryLatitude == null || deliveryLongitude == null || isNaN(deliveryLatitude) || isNaN(deliveryLongitude))) {
      toast.error("Coordonnées GPS manquantes. Veuillez positionner votre repère de livraison.");
      return;
    }

    if (isOutOfZone) {
      toast.error(OUT_OF_ZONE_MESSAGE);
      setStep(2);
      return;
    }

    if (!isPickupAllowed && deliveryMode === 'pickup') {
      toast.error("Le retrait en boutique n'est pas disponible.");
      return;
    }

    if (!isCodAllowed && paymentMethod === 'cod') {
      toast.error("Le paiement à la livraison n'est pas disponible pour ce vendeur.");
      return;
    }

    setPaying(true);
    try {
      // ─────────────────────────────────────────────────────────────
      // SCÉNARIO 4 : Retrait en boutique + Paiement au retrait (Cash at shop)
      // ─────────────────────────────────────────────────────────────
      if (paymentMethod === 'cash_at_shop' || paymentMethod === 'cod') {
        // Les montants ne sont plus composés ici. `create_cod_order` relit les
        // prix, résout les positions, calcule la distance et les frais, puis
        // écrit une commande et une course PAR VENDEUR. Le découpage précédent
        // créait une commande par ARTICLE en divisant un frais de livraison
        // unique entre elles — un livreur pouvait se voir proposer 250 FCFA.
        const items = isCartMode
          ? cartItems.map((ci) => ({
              listing_id: ci.listing_id,
              variant_id: ci.variant_id || null,
              variant_label: ci.variant_label || null,
              quantity: ci.quantity,
            }))
          : [
              {
                listing_id: listing!.id,
                variant_id: requestedVariantId || null,
                variant_label: directSelectedVariant?.label || null,
                quantity: 1,
              },
            ];

        const isShopPickup = paymentMethod === 'cash_at_shop';
        const roadKmBySeller: Record<string, number> = {};
        deliveryFeesBySeller.forEach((_fee, sellerId) => {
          if (distanceKm > 0) roadKmBySeller[sellerId] = distanceKm;
        });

        const { data: rpcData, error: rpcError } = await supabase.rpc('create_cod_order', {
          p_items: items,
          p_delivery_mode: isShopPickup ? 'pickup' : 'delivery',
          p_payment_method: isShopPickup ? 'cash_at_shop' : 'cod',
          p_delivery_address: isShopPickup ? 'Retrait en boutique' : (deliveryAddress || 'Daloa'),
          // Paramètres facultatifs de la RPC : `undefined` les omet (défaut SQL = NULL).
          p_delivery_lat: isShopPickup ? undefined : (deliveryLatitude ?? undefined),
          p_delivery_lng: isShopPickup ? undefined : (deliveryLongitude ?? undefined),
          p_delivery_district: undefined,
          p_road_km: isShopPickup ? {} : roadKmBySeller,
        });

        if (rpcError) throw new Error(rpcError.message || 'Erreur de création de la commande');

        const result = rpcData as { success?: boolean; reason?: string; order_ids?: string[] } | null;
        if (!result?.success) {
          throw new Error(
            result?.reason === 'no_active_listing'
              ? "Ces articles ne sont plus disponibles à la vente."
              : result?.reason === 'cod_not_allowed'
                ? 'Le paiement à la livraison n’est pas disponible pour cet article. Choisissez le paiement en ligne.'
                : result?.reason === 'pickup_not_allowed'
                  ? 'Le retrait en boutique n’est pas disponible pour cet article. Choisissez la livraison.'
                  : result?.reason || 'Erreur de création de la commande'
          );
        }

        if (isCartMode) clearCart();

        const orderCount = result.order_ids?.length || 1;
        toast.success(
          isShopPickup
            ? orderCount > 1
              ? 'Vos réservations en boutique ont été enregistrées ! Vous réglerez directement sur place.'
              : 'Réservation enregistrée ! Vous réglerez le vendeur directement à sa boutique.'
            : orderCount > 1
              ? 'Vos commandes (Paiement à la livraison) ont été enregistrées ! Les vendeurs vont confirmer la disponibilité.'
              : 'Commande enregistrée (Paiement à la livraison) ! Le vendeur va confirmer la disponibilité.'
        );
        navigate('/mes-commandes');
        return;
      }

      // ─────────────────────────────────────────────────────────────
      // SCÉNARIOS 1 & 3 : Paiement en ligne (Escrow Séquestre)
      // (Scenario 1 = Livraison domicile, Scenario 3 = Retrait en boutique)
      // ─────────────────────────────────────────────────────────────
      const { createOrder } = await import("../lib/payment");
      const isPickupMode = deliveryMode === 'pickup';
      const resolvedDeliveryMode: 'delivery' | 'pickup_point' = isPickupMode ? 'pickup_point' : 'delivery';
      const resolvedAddress = isPickupMode ? 'Retrait en boutique' : (deliveryAddress || 'Daloa');

      const processItem = async (targetListingId: string, targetVariantId?: string, targetQty: number = 1, targetAmount: number = total) => {
        const result = await createOrder({
          buyer_id: user.id,
          listing_id: targetListingId,
          variant_id: targetVariantId,
          quantity: targetQty,
          delivery_address: resolvedAddress,
          delivery_mode: resolvedDeliveryMode,
          delivery_lat: isPickupMode ? undefined : deliveryLatitude,
          delivery_lng: isPickupMode ? undefined : deliveryLongitude,
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
        const allInputs = cartItems.map((item) => ({
          buyer_id: user.id,
          listing_id: item.listing_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          delivery_address: resolvedAddress,
          delivery_mode: resolvedDeliveryMode,
          delivery_lat: isPickupMode ? undefined : deliveryLatitude,
          delivery_lng: isPickupMode ? undefined : deliveryLongitude,
          amount: (item.listing_price || 0) * item.quantity,
        }));
        const first = allInputs[0];
        const result = await createOrder({
          ...first,
          amount: total,
        }, allInputs);
        if (result.payment_url) {
          clearCart();
          window.location.href = result.payment_url;
        } else {
          throw new Error("Aucune URL de paiement reçue");
        }
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
        <div className="mx-4 max-w-lg pt-10 md:mx-auto">
          <Card className="rounded-2xl border border-gray-100 p-6">
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
        <div className="mx-4 max-w-lg pt-10 md:mx-auto">
          <Card className="rounded-2xl border border-gray-100 p-6">
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
      {/* En-tête sobre : l'étape est donnée par la barre d'étapes juste dessous
          (elle était écrite deux fois, sur un bandeau en dégradé). */}
      <header className="border-b border-gray-100 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            type="button"
            onClick={handleHeaderBack}
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95"
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="truncate text-base font-semibold text-gray-900">
            {isCartMode ? 'Finaliser votre commande' : 'Finaliser votre achat'}
          </h1>
        </div>
      </header>

      {/* ── FLOATING MODERN STEPPER ── */}
      <div className="relative z-20 mt-3 max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl p-3 border border-gray-100">
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
                if (isOutOfZone) {
                  toast.error(OUT_OF_ZONE_MESSAGE);
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

              {isPickupAllowed ? (
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
                  userType="buyer"
                  onLocationChange={(lat, lng) => {
                    setDeliveryLatitude(lat);
                    setDeliveryLongitude(lng);
                  }}
                  placeholder="Cliquez sur la carte pour affiner la position"
                  className="w-full h-56 bg-gray-100"
                  sellerCoords={isCartMode ? null : sellerCoords}
                />
              </div>

              {/* Retour immédiat en déplaçant le repère : sans cela, la distance
                  et le tarif n'apparaissaient qu'à l'étape suivante. */}
              {!isPickup && isOutOfZone && (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700" role="alert">
                  <MapPin size={14} />
                  <span>{OUT_OF_ZONE_MESSAGE}</span>
                </div>
              )}
              {!isPickup && !isOutOfZone && distanceKm > 0 && (
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-orange-50 border border-orange-100 px-4 py-2.5 text-xs font-bold text-orange-700" aria-live="polite">
                  <Navigation size={14} className={routing ? 'animate-pulse' : undefined} />
                  {routing ? (
                    <span>Calcul de l'itinéraire…</span>
                  ) : (
                    <>
                      <span>Distance : {distanceKm} km</span>
                      <span className="text-orange-300">·</span>
                      <span>
                        Frais : {formatPrice(deliveryFee)}
                        {/* Un frais par vendeur, comme le serveur : 2 vendeurs = 2 courses. */}
                        {deliveryFeesBySeller.size > 1 && ` (${deliveryFeesBySeller.size} vendeurs)`}
                      </span>
                    </>
                  )}
                </div>
              )}

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

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outlined"
                color="secondary"
                size="md"
                onClick={() => setStep(1)}
                className="rounded-xl px-5 font-bold shrink-0"
              >
                ← Retour
              </Button>
              <Button
                variant="filled"
                color="primary"
                size="md"
                onClick={handleStep2Next}
                className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 font-bold text-white shadow-sm active:scale-[0.98] whitespace-nowrap"
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
                        {isPickup ? "Retrait en boutique" : distanceKm > 0 ? `Livraison (${distanceKm} km)` : "Livraison"}
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
                      <span>Frais de protection ({BUYER_FEE_RATE * 100}%)</span>
                    </div>
                    <span className="font-extrabold text-gray-900 tabular-nums">{formatPrice(buyerFee)}</span>
                  </div>

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

              <div className={cn("grid gap-3", (isPickupAllowed || isCodAllowed) ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                {isCodAllowed && deliveryMode === 'delivery' && (
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
                      <span className="text-xs font-extrabold flex items-center gap-1.5">
                        <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Paiement à la livraison</span>
                      </span>
                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", paymentMethod === 'cod' ? "border-orange-500 bg-orange-500 text-white" : "border-gray-300")}>
                        {paymentMethod === 'cod' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-extrabold mt-2">Recommandé • Espèces ou Mobile Money au livreur</span>
                  </button>
                )}

                {isPickupAllowed && deliveryMode === 'pickup' && (
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
                      <span className="text-xs font-extrabold flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Espèces au magasin</span>
                      </span>
                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", paymentMethod === 'cash_at_shop' ? "border-orange-500 bg-orange-500 text-white" : "border-gray-300")}>
                        {paymentMethod === 'cash_at_shop' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-amber-700 font-extrabold mt-2">Payer directement au vendeur sur place</span>
                  </button>
                )}

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
                    <span className="text-xs font-extrabold flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-orange-600 shrink-0" />
                      <span>Paiement Mobile Money Sécurisé</span>
                    </span>
                    <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", paymentMethod === 'online' ? "border-orange-500 bg-orange-500 text-white" : "border-gray-300")}>
                      {paymentMethod === 'online' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-500 mt-2 font-medium">Wave, Orange Money, MTN MoMo, Moov</span>
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-100 text-xs text-orange-950 leading-relaxed font-medium">
                {paymentMethod === 'online' && (
                  <p className="flex items-start gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Paiement protégé :</strong> Votre argent est sécurisé sous séquestre par MoneyFusion et vous est <strong>remboursé à 100%</strong> en cas d'annulation ou de non-livraison.</span>
                  </p>
                )}
                {paymentMethod === 'cod' && (
                  <p className="flex items-start gap-1.5">
                    <Truck className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                    <span><strong>Livreur Affilié :</strong> Cette livraison est assurée par le livreur personnel du vendeur. Remettez les espèces au livreur après vérification du colis.</span>
                  </p>
                )}
                {paymentMethod === 'cash_at_shop' && (
                  <p className="flex items-start gap-1.5">
                    <Store className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Retrait en Boutique :</strong> Rendez-vous à la boutique du vendeur à Daloa pour vérifier l'article et régler sur place en espèces.</span>
                  </p>
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

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outlined"
                color="secondary"
                size="md"
                onClick={() => setStep(deliveryMode === 'pickup' ? 1 : 2)}
                className="rounded-xl px-5 font-bold shrink-0"
              >
                ← Retour
              </Button>
              <Button
                variant="filled"
                color="primary"
                size="md"
                loading={paying}
                disabled={isSelfCheckout}
                icon={<CreditCard className="h-4 w-4" />}
                onClick={handlePay}
                className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 font-bold text-white shadow-sm active:scale-[0.98] whitespace-nowrap"
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
