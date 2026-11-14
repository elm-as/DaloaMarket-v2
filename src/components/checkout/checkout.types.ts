import type { ListingVariant } from '../../types/listing';
import type { ServerQuote } from '../../lib/payment';
import type { AppliedPromoCode } from './PromoCodeInputBox';

export type CheckoutStep = 1 | 2 | 3;
export type DeliveryMode = 'delivery' | 'pickup';
export type CheckoutPaymentMethod = 'online' | 'cod' | 'cash_at_shop';
export type QuoteStatus = 'idle' | 'loading' | 'ready' | 'error' | 'fallback';

export const OUT_OF_ZONE_MESSAGE =
  'Nous livrons uniquement à Daloa. Placez le repère sur votre adresse à Daloa.';

export interface ListingData {
  id: string;
  title: string;
  price: number;
  photos: string[];
  user_id: string;
  category?: string | null;
  latitude: number | null;
  longitude: number | null;
  original_price: number | null;
  seller_shop_latitude: number | null;
  seller_shop_longitude: number | null;
  seller_district: string | null;
  is_seller_pro?: boolean;
  variants?: ListingVariant[];
}

export interface CartSellerPoint {
  sellerId: string;
  lat: number;
  lng: number;
  isPro?: boolean;
}

export interface SellerDeliverySettings {
  home_delivery_enabled: boolean;
  cash_on_delivery_enabled: boolean;
}

export interface CheckoutTotals {
  productAmount: number;
  isPickup: boolean;
  isCashPayment: boolean;
  sellerCount: number;
  isGroupedDelivery: boolean;
  groupedDeliverySavings: number;
  deliveryFee: number;
  buyerFee: number;
  applicableDaloaCash: number;
  total: number;
  quoteReady: boolean;
  paymentActionLabel: string;
}

export interface CheckoutQuoteState {
  serverQuote: ServerQuote | null;
  quoteStatus: QuoteStatus;
  appliedPromo: AppliedPromoCode | null;
}
