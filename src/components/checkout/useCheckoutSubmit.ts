import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { QUOTE_RETRY_REASONS } from '../../lib/payment';
import type { CartItem } from '../../contexts/CartContext';
import type { ListingVariant } from '../../types/listing';
import {
  OUT_OF_ZONE_MESSAGE,
  type CheckoutPaymentMethod,
  type CheckoutStep,
  type CheckoutTotals,
  type DeliveryMode,
  type ListingData,
  type QuoteStatus,
} from './checkout.types';

interface CheckoutSubmitParams {
  user: { id: string; email?: string | null; is_test_user?: boolean; is_test_users?: boolean } | null;
  paymentConfig: Record<string, any> | null;
  onlineDisabled: boolean;
  isCartMode: boolean;
  isDigital: boolean;
  cartItems: CartItem[];
  clearCart: () => Promise<void>;
  listing: ListingData | null;
  directSelectedVariant?: ListingVariant;
  requestedVariantId?: string;
  deliveryMode: DeliveryMode;
  paymentMethod: CheckoutPaymentMethod;
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  distanceKm: number;
  deliveryFeesBySeller: Map<string, number>;
  isOutOfZone: boolean;
  isPickupAllowed: boolean;
  isCodAllowed: boolean;
  isCodBlocked: boolean;
  codBlockedFormattedDate: string;
  quoteStatus: QuoteStatus;
  quoteId?: string;
  totals: CheckoutTotals;
  setStep: (step: CheckoutStep) => void;
  setAddressError: (val: boolean) => void;
  bumpQuoteNonce: () => void;
}

function resolveCodErrorMessage(reason?: string): string {
  switch (reason) {
    case 'cod_blocked':
      return 'Votre compte est temporairement suspendu du paiement à la livraison suite à des livraisons non réceptionnées. Veuillez choisir le paiement par Mobile Money.';
    case 'no_active_listing':
      return 'Ces articles ne sont plus disponibles à la vente.';
    case 'cod_not_allowed':
      return "Le paiement à la livraison n'est pas disponible pour cet article. Choisissez le paiement en ligne.";
    case 'pickup_not_allowed':
      return "Le retrait en boutique n'est pas disponible pour cet article. Choisissez la livraison.";
    default:
      return reason || 'Erreur de création de la commande';
  }
}

export function useCheckoutSubmit(params: CheckoutSubmitParams) {
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);

  const validateBeforeSubmit = (): boolean => {
    const {
      deliveryMode,
      deliveryAddress,
      deliveryLatitude,
      deliveryLongitude,
      isOutOfZone,
      isPickupAllowed,
      isCodAllowed,
      isCodBlocked,
      codBlockedFormattedDate,
      paymentMethod,
      onlineDisabled,
      paymentConfig,
      totals,
      quoteStatus,
      setAddressError,
      setStep,
      bumpQuoteNonce,
    } = params;

    if (deliveryMode === 'delivery' && !deliveryAddress.trim()) {
      setAddressError(true);
      toast.error('Veuillez renseigner une adresse de livraison (Quartier, repère, etc.)');
      return false;
    }
    const coordsInvalid =
      deliveryLatitude == null ||
      deliveryLongitude == null ||
      Number.isNaN(deliveryLatitude) ||
      Number.isNaN(deliveryLongitude);
    if (deliveryMode === 'delivery' && coordsInvalid) {
      toast.error('Coordonnées GPS manquantes. Veuillez positionner votre repère de livraison.');
      return false;
    }
    if (isOutOfZone) {
      toast.error(OUT_OF_ZONE_MESSAGE);
      setStep(2);
      return false;
    }
    if (!isPickupAllowed && deliveryMode === 'pickup') {
      toast.error("Le retrait en boutique n'est pas disponible.");
      return false;
    }
    if (!isCodAllowed && paymentMethod === 'cod') {
      toast.error(
        isCodBlocked
          ? `Le paiement à la livraison est suspendu jusqu'au ${codBlockedFormattedDate}. Veuillez régler par Mobile Money.`
          : "Le paiement à la livraison n'est pas disponible pour ce vendeur."
      );
      return false;
    }
    if (paymentMethod === 'online' && onlineDisabled) {
      toast.error(paymentConfig?.notice || 'Les paiements en ligne sont temporairement désactivés.');
      return false;
    }
    if (!totals.quoteReady && quoteStatus !== 'fallback') {
      if (quoteStatus !== 'loading') bumpQuoteNonce();
      toast.error('Le prix est en cours de calcul, réessayez dans un instant.');
      return false;
    }
    return true;
  };

  const submitCashOrder = async () => {
    const {
      isCartMode,
      cartItems,
      clearCart,
      listing,
      requestedVariantId,
      directSelectedVariant,
      paymentMethod,
      deliveryAddress,
      deliveryLatitude,
      deliveryLongitude,
      deliveryFeesBySeller,
      distanceKm,
      quoteId,
      totals,
    } = params;

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
      p_delivery_address: isShopPickup ? 'Retrait en boutique' : deliveryAddress || 'Daloa',
      p_delivery_lat: isShopPickup ? undefined : (deliveryLatitude ?? undefined),
      p_delivery_lng: isShopPickup ? undefined : (deliveryLongitude ?? undefined),
      p_delivery_district: undefined,
      p_road_km: isShopPickup ? {} : roadKmBySeller,
      ...(quoteId ? { p_quote_id: quoteId } : {}),
      p_daloa_cash_applied: totals.applicableDaloaCash,
      p_grouped_delivery_discount: totals.groupedDeliverySavings,
    } as never);

    if (rpcError) throw new Error(rpcError.message || 'Erreur de création de la commande');
    const result = rpcData as { success?: boolean; reason?: string; order_ids?: string[] } | null;

    if (!result?.success) {
      if (result?.reason && QUOTE_RETRY_REASONS.includes(result.reason)) {
        const retryError = new Error(
          'Le prix vient d’être recalculé. Vérifiez le nouveau total puis validez.'
        ) as Error & { reason?: string };
        retryError.reason = result.reason;
        throw retryError;
      }
      throw new Error(resolveCodErrorMessage(result?.reason));
    }

    if (isCartMode) clearCart();
    const orderCount = result.order_ids?.length || 1;
    const firstOrderId = result.order_ids?.[0];
    toast.success(
      isShopPickup
        ? orderCount > 1
          ? 'Vos réservations en boutique ont été enregistrées ! Vous réglerez directement sur place.'
          : 'Réservation enregistrée ! Vous réglerez le vendeur directement à sa boutique.'
        : orderCount > 1
          ? 'Vos commandes (Paiement à la livraison) ont été enregistrées ! Les vendeurs vont confirmer la disponibilité.'
          : 'Commande enregistrée (Paiement à la livraison) ! Le vendeur va confirmer la disponibilité.'
    );
    navigate(firstOrderId ? `/commande-confirmee/${firstOrderId}` : '/mes-commandes');
  };

  const submitOnlineOrder = async () => {
    const {
      user,
      isCartMode,
      isDigital,
      cartItems,
      clearCart,
      listing,
      requestedVariantId,
      deliveryMode,
      deliveryAddress,
      deliveryLatitude,
      deliveryLongitude,
      quoteId,
      totals,
    } = params;

    const { createOrder } = await import('../../lib/payment');
    const isPickupMode = deliveryMode === 'pickup';
    const resolvedDeliveryMode: 'delivery' | 'pickup_point' = isPickupMode ? 'pickup_point' : 'delivery';
    const resolvedAddress = isDigital
      ? 'Envoi numérique direct en privé (Messagerie / WhatsApp)'
      : isPickupMode
        ? 'Retrait en boutique'
        : deliveryAddress || 'Daloa';

    if (isCartMode) {
      const allInputs = cartItems.map((item) => ({
        buyer_id: user!.id,
        listing_id: item.listing_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        delivery_address: resolvedAddress,
        delivery_mode: resolvedDeliveryMode,
        delivery_lat: isPickupMode ? undefined : deliveryLatitude,
        delivery_lng: isPickupMode ? undefined : deliveryLongitude,
        amount: (item.listing_price || 0) * item.quantity,
      }));
      const result = await createOrder(
        {
          ...allInputs[0],
          amount: totals.total,
          quoteId,
          daloaCashDiscount: totals.applicableDaloaCash,
        },
        allInputs
      );
      if (!result.payment_url) throw new Error('Aucune URL de paiement reçue');
      clearCart();
      window.location.href = result.payment_url;
      return;
    }

    const result = await createOrder({
      buyer_id: user!.id,
      listing_id: listing!.id,
      variant_id: requestedVariantId,
      quantity: 1,
      delivery_address: resolvedAddress,
      delivery_mode: resolvedDeliveryMode,
      delivery_lat: isPickupMode ? undefined : deliveryLatitude,
      delivery_lng: isPickupMode ? undefined : deliveryLongitude,
      amount: totals.total,
      quoteId,
      daloaCashDiscount: totals.applicableDaloaCash,
    });
    if (!result.payment_url) throw new Error('Aucune URL de paiement reçue');
    window.location.href = result.payment_url;
  };

  const handlePay = async () => {
    const { user, paymentMethod, isCartMode, clearCart, bumpQuoteNonce } = params;
    if (!user || !validateBeforeSubmit()) return;

    const isTestUser = Boolean(
      user.is_test_user ||
        user.is_test_users ||
        user.email?.toLowerCase().includes('google-play-test') ||
        user.email?.toLowerCase().includes('test-store')
    );

    if (isTestUser) {
      setPaying(true);
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (isCartMode) clearCart();
      toast.success(
        paymentMethod === 'cash_at_shop'
          ? 'Réservation enregistrée ! Vous réglerez le vendeur directement à sa boutique.'
          : 'Commande confirmée avec succès !'
      );
      navigate('/mes-commandes');
      return;
    }

    setPaying(true);
    try {
      if (paymentMethod === 'cash_at_shop' || paymentMethod === 'cod') {
        await submitCashOrder();
      } else {
        await submitOnlineOrder();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la commande';
      const reason = (err as { reason?: string } | null)?.reason;
      if (reason && QUOTE_RETRY_REASONS.includes(reason)) bumpQuoteNonce();
      toast.error(message);
    } finally {
      setPaying(false);
    }
  };

  return { paying, handlePay };
}
