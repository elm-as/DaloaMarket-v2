import { calculateOrder, calculateDeliveryFee, haversineDistance, type LatLng } from './delivery';

export const DELIVERY_FEE = 500;
export const DELIVERY_MIN = 500;
export const DELIVERY_RATE_PER_KM = 85;
export const DELIVERY_FREE_KM = 1.5;
export const BUYER_FEE_RATE = 0.03;
export const SELLER_FEE_RATE = 0.035;
export const DRIVER_FEE_RATE = 0.10;

export const BOOST_PRICE = 500;
export const BUMP_PRICE = 200;
export const SELLER_BADGE_PRICE = 2500;
export const SELLER_BADGE_YEARLY_PRICE = 25000;
export const LISTING_PACK_PRICE = 500;
export const PACK_PRO_PRICE = 2500;

export function calculateOrderPricing(productPrice: number, distanceKm: number = 0, isProSeller: boolean = false) {
  return calculateOrder(productPrice, distanceKm, isProSeller);
}

export { haversineDistance, calculateDeliveryFee, calculateOrder };
export type { LatLng };
