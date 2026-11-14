import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDate, isLocationInDaloa } from '../../lib/utils';
import type { LatLng } from '../../lib/pricing';
import { resolveSellerPoint, resolveBuyerPoint } from '../../lib/daloaGeo';
import type { AppliedPromoCode } from './PromoCodeInputBox';
import type { CartItem } from '../../contexts/CartContext';
import {
  OUT_OF_ZONE_MESSAGE,
  type CartSellerPoint,
  type CheckoutPaymentMethod,
  type CheckoutStep,
  type DeliveryMode,
  type ListingData,
  type SellerDeliverySettings,
} from './checkout.types';
import { computeCheckoutTotals } from './checkoutPricingSummary';
import { loadCartCheckoutState, loadSingleListingCheckoutState } from './checkoutLoaders';
import { useCheckoutRoutingAndQuote } from './useCheckoutRoutingAndQuote';

interface CheckoutDataParams {
  listingId?: string;
  requestedVariantId?: string;
  userId?: string;
  userProfile: Record<string, any> | null;
  phaseConfig: Record<string, any>;
  paymentConfig: Record<string, any> | null;
  cart: {
    items: CartItem[];
    removeFromCart: (id: string) => Promise<void>;
    updateQuantity: (id: string, qty: number, max?: number) => Promise<void>;
  };
}

export function useCheckoutData({
  listingId,
  requestedVariantId,
  userId,
  userProfile,
  phaseConfig,
  paymentConfig,
  cart,
}: CheckoutDataParams) {
  const navigate = useNavigate();
  const isCartMode = !listingId || listingId === 'cart';

  const onlineDisabled = Boolean(
    paymentConfig?.disable_online_payments ||
      paymentConfig?.force_cod_only ||
      paymentConfig?.status === 'down'
  );

  const [listing, setListing] = useState<ListingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDistrict, setDeliveryDistrict] = useState<string>(
    (userProfile as { district?: string } | null)?.district || 'Tazibouo'
  );
  const [addressError, setAddressError] = useState(false);
  const [deliveryLatitude, setDeliveryLatitude] = useState<number>(6.8774);
  const [deliveryLongitude, setDeliveryLongitude] = useState<number>(-6.4502);
  const [cartSellers, setCartSellers] = useState<Map<string, CartSellerPoint>>(new Map());
  const [isCartSelfCheckout, setIsCartSelfCheckout] = useState(false);
  const [sellerSettings, setSellerSettings] = useState<SellerDeliverySettings>({
    home_delivery_enabled: true,
    cash_on_delivery_enabled: false,
  });
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>(() => {
    if (onlineDisabled) return 'cod';
    return phaseConfig?.default_payment_method === 'cod' ? 'cod' : 'online';
  });
  const [step, setStep] = useState<CheckoutStep>(1);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromoCode | null>(null);

  const isDigital = !isCartMode && listing?.category === 'digital';

  useEffect(() => {
    if (isDigital && deliveryMode !== 'pickup') setDeliveryMode('pickup');
  }, [isDigital, deliveryMode]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      if (isCartMode) {
        const res = await loadCartCheckoutState({
          cartItems: cart.items,
          userId,
          removeFromCart: cart.removeFromCart,
          updateQuantity: cart.updateQuantity,
        });
        if (!mounted) return;
        if (res?.invalidRedirect) {
          navigate('/panier');
          return;
        }
        if (res) {
          setCartSellers(res.sellerMap);
          setIsCartSelfCheckout(res.hasSelfItem);
          setSellerSettings(res.sellerSettings);
          if (res.homeDeliveryDisabled) {
            setDeliveryMode('pickup');
            setPaymentMethod('cash_at_shop');
          }
        }
        setLoading(false);
        return;
      }

      if (!listingId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setNotFound(false);
      const res = await loadSingleListingCheckoutState(listingId, requestedVariantId);
      if (!mounted) return;
      if (res.status === 'not_found') {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (res.status === 'redirect_listing') {
        navigate(`/listings/${listingId}`);
        return;
      }
      if (res.status === 'redirect_home') {
        navigate('/');
        return;
      }
      if (res.listing) setListing(res.listing);
      if (res.sellerSettings) setSellerSettings(res.sellerSettings);
      if (res.homeDeliveryDisabled) {
        setDeliveryMode('pickup');
        setPaymentMethod('cash_at_shop');
      }
      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [listingId, requestedVariantId, isCartMode, cart.items, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const buyerCoords: LatLng | null =
    deliveryLatitude != null && deliveryLongitude != null
      ? { latitude: deliveryLatitude, longitude: deliveryLongitude }
      : null;

  const sellerCoords: LatLng | null = listing
    ? resolveSellerPoint({
        shop_latitude: listing.seller_shop_latitude,
        shop_longitude: listing.seller_shop_longitude,
        district: listing.seller_district,
      })
    : null;

  const isOutOfZone =
    deliveryMode === 'delivery' &&
    deliveryLatitude != null &&
    deliveryLongitude != null &&
    !isLocationInDaloa(deliveryLatitude, deliveryLongitude);

  const routingQuote = useCheckoutRoutingAndQuote({
    step,
    userId,
    isOutOfZone,
    isCartMode,
    cartItems: cart.items,
    listing,
    requestedVariantId,
    cartSellers,
    buyerCoords,
    sellerCoords,
    deliveryMode,
    deliveryLatitude,
    deliveryLongitude,
    deliveryAddress,
  });

  const isSellerPro = isCartMode
    ? cart.items.length > 0 && cart.items.every((item) => cartSellers.get(item.listing_id)?.isPro === true)
    : (listing?.is_seller_pro ?? false);

  const codBlockedUntil = userProfile?.cod_blocked_until;
  const isCodBlocked = Boolean(codBlockedUntil && new Date(codBlockedUntil) > new Date());
  const codBlockedFormattedDate = codBlockedUntil ? formatDate(codBlockedUntil) : '';
  const isCodAllowed = (isSellerPro || phaseConfig.allow_cod_for_all) && !isCodBlocked;
  const isPickupAllowed = isSellerPro || phaseConfig.allow_pickup_for_all || isDigital;

  useEffect(() => {
    if (!isPickupAllowed && deliveryMode === 'pickup') setDeliveryMode('delivery');
    if (onlineDisabled) {
      if (paymentMethod === 'online') {
        setPaymentMethod(deliveryMode === 'pickup' && isPickupAllowed ? 'cash_at_shop' : 'cod');
      }
      return;
    }
    if ((!isCodAllowed || isCodBlocked) && paymentMethod === 'cod') setPaymentMethod('online');
    if (!isPickupAllowed && paymentMethod === 'cash_at_shop') setPaymentMethod('online');
  }, [isSellerPro, isPickupAllowed, isCodAllowed, isCodBlocked, deliveryMode, paymentMethod, onlineDisabled]);

  const directSelectedVariant = !isCartMode
    ? listing?.variants?.find((v) => v.id === requestedVariantId)
    : undefined;

  const totals = computeCheckoutTotals({
    isCartMode,
    cartItems: cart.items,
    listing,
    directSelectedVariant,
    cartSellers,
    deliveryFeesBySeller: routingQuote.deliveryFeesBySeller,
    distanceKm: routingQuote.distanceKm,
    isSellerPro,
    deliveryMode,
    paymentMethod,
    step,
    quoteStatus: routingQuote.quoteStatus,
    serverQuote: routingQuote.serverQuote,
    appliedPromo,
    onlineDisabled,
  });

  const handleHeaderBack = () => {
    if (step > 1) {
      setStep(step === 3 && deliveryMode === 'pickup' ? 1 : ((step - 1) as CheckoutStep));
      return;
    }
    navigate(isCartMode ? '/panier' : `/listings/${listing?.id || ''}`);
  };

  const handleStep2Next = () => {
    if (!deliveryAddress.trim()) {
      setAddressError(true);
      toast.error('Veuillez renseigner une adresse de livraison (Quartier, repère, etc.)');
      return;
    }
    if (deliveryMode === 'delivery') {
      const hasValidCoords =
        deliveryLatitude != null &&
        deliveryLongitude != null &&
        !Number.isNaN(deliveryLatitude) &&
        !Number.isNaN(deliveryLongitude);
      if (!hasValidCoords || isOutOfZone) {
        const fallbackPoint = resolveBuyerPoint(null, deliveryDistrict);
        setDeliveryLatitude(fallbackPoint.latitude);
        setDeliveryLongitude(fallbackPoint.longitude);
      }
    }
    setStep(3);
  };

  const handleSelectStep = (target: CheckoutStep) => {
    if (target === 2 && deliveryMode === 'pickup') return;
    if (target === 3) {
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
    }
    setStep(target);
  };

  return {
    isCartMode,
    isDigital,
    onlineDisabled,
    listing,
    directSelectedVariant,
    sellerCoords,
    loading,
    notFound,
    step,
    setStep,
    handleHeaderBack,
    handleStep2Next,
    handleSelectStep,
    deliveryAddress,
    setDeliveryAddress,
    deliveryDistrict,
    setDeliveryDistrict,
    addressError,
    setAddressError,
    deliveryLatitude,
    setDeliveryLatitude,
    deliveryLongitude,
    setDeliveryLongitude,
    distanceKm: routingQuote.distanceKm,
    routing: routingQuote.routing,
    deliveryFeesBySeller: routingQuote.deliveryFeesBySeller,
    sellerSettings,
    deliveryMode,
    setDeliveryMode,
    paymentMethod,
    setPaymentMethod,
    isOutOfZone,
    isCodBlocked,
    codBlockedFormattedDate,
    isCodAllowed,
    isPickupAllowed,
    isSelfCheckout: isCartMode ? isCartSelfCheckout : listing?.user_id === userId,
    serverQuote: routingQuote.serverQuote,
    quoteStatus: routingQuote.quoteStatus,
    bumpQuoteNonce: routingQuote.bumpQuoteNonce,
    appliedPromo,
    setAppliedPromo,
    totals,
  };
}
