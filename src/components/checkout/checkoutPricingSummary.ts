import { calculateOrderPricing } from '../../lib/pricing';
import { formatPrice } from '../../lib/utils';
import type { CartItem } from '../../contexts/CartContext';
import type { ListingVariant } from '../../types/listing';
import type { ServerQuote } from '../../lib/payment';
import type { AppliedPromoCode } from './PromoCodeInputBox';
import type {
  CartSellerPoint,
  CheckoutPaymentMethod,
  CheckoutStep,
  CheckoutTotals,
  DeliveryMode,
  ListingData,
  QuoteStatus,
} from './checkout.types';

export interface TotalsComputationInput {
  isCartMode: boolean;
  cartItems: CartItem[];
  listing: ListingData | null;
  directSelectedVariant?: ListingVariant;
  cartSellers: Map<string, CartSellerPoint>;
  deliveryFeesBySeller: Map<string, number>;
  distanceKm: number;
  isSellerPro: boolean;
  deliveryMode: DeliveryMode;
  paymentMethod: CheckoutPaymentMethod;
  step: CheckoutStep;
  quoteStatus: QuoteStatus;
  serverQuote: ServerQuote | null;
  appliedPromo: AppliedPromoCode | null;
  onlineDisabled: boolean;
}

function resolveActionLabel(
  paymentMethod: CheckoutPaymentMethod,
  onlineDisabled: boolean,
  total: number
): string {
  if (paymentMethod === 'cash_at_shop') return 'Réserver en boutique';
  if (paymentMethod === 'cod') return `Commander · ${formatPrice(total)}`;
  if (onlineDisabled) return 'Paiement en ligne temporairement indisponible';
  return `Payer ${formatPrice(total)}`;
}

/**
 * Calcule le détail financier affiché au checkout (sous-total, livraison groupée,
 * frais acheteur, réduction code promo et libellé du bouton de paiement).
 */
export function computeCheckoutTotals(input: TotalsComputationInput): CheckoutTotals {
  const {
    isCartMode,
    cartItems,
    listing,
    directSelectedVariant,
    cartSellers,
    deliveryFeesBySeller,
    distanceKm,
    isSellerPro,
    deliveryMode,
    paymentMethod,
    step,
    quoteStatus,
    serverQuote,
    appliedPromo,
    onlineDisabled,
  } = input;

  const productAmount = isCartMode
    ? cartItems.reduce((sum, item) => sum + item.listing_price * item.quantity, 0)
    : (directSelectedVariant?.price ?? listing?.price ?? 0);

  const isPickup = deliveryMode === 'pickup';
  const pricing = calculateOrderPricing({
    price: productAmount,
    distanceKm,
    isProSeller: isSellerPro,
  });

  const uniqueSellerIds = isCartMode
    ? Array.from(new Set(Array.from(cartSellers.values()).map((s) => s.sellerId)))
    : listing?.user_id
      ? [listing.user_id]
      : [];
  const sellerCount = Math.max(1, uniqueSellerIds.length);
  const isGroupedDelivery = isCartMode && sellerCount > 1 && !isPickup;

  const rawSumOfSellerFees = Array.from(deliveryFeesBySeller.values()).reduce(
    (sum, fee) => sum + fee,
    0
  );
  const maxSingleSellerFee =
    deliveryFeesBySeller.size > 0
      ? Math.max(...Array.from(deliveryFeesBySeller.values()))
      : pricing.delivery;

  const baseDeliveryCalc = isGroupedDelivery
    ? maxSingleSellerFee + (sellerCount - 1) * 300
    : deliveryFeesBySeller.size > 0
      ? rawSumOfSellerFees
      : pricing.delivery;

  const groupedDeliverySavings = isGroupedDelivery
    ? Math.max(0, rawSumOfSellerFees - baseDeliveryCalc)
    : 0;

  const isCashPayment = paymentMethod === 'cash_at_shop' || paymentMethod === 'cod' || isPickup;
  const quoteReady = step === 3 && quoteStatus === 'ready' && serverQuote != null;
  const deliveryFee = quoteReady ? serverQuote!.deliveryTotal : isPickup ? 0 : baseDeliveryCalc;
  const buyerFee = isCashPayment ? 0 : quoteReady ? serverQuote!.buyerFeeTotal : pricing.buyerFee;
  const rawTotal = isCashPayment
    ? productAmount + deliveryFee
    : quoteReady
      ? serverQuote!.totalAmount
      : productAmount + deliveryFee + buyerFee;

  const applicableDaloaCash = appliedPromo
    ? Math.min(appliedPromo.discountAmount, rawTotal)
    : 0;
  const total = Math.max(0, rawTotal - applicableDaloaCash);

  return {
    productAmount,
    isPickup,
    isCashPayment,
    sellerCount,
    isGroupedDelivery,
    groupedDeliverySavings,
    deliveryFee,
    buyerFee,
    applicableDaloaCash,
    total,
    quoteReady,
    paymentActionLabel: resolveActionLabel(paymentMethod, onlineDisabled, total),
  };
}
