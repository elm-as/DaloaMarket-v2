import { calculateOrder, calculateDeliveryFee, haversineDistance, type LatLng } from './delivery';

export const DELIVERY_FEE = 500;
export {
  DELIVERY_MIN,
  DELIVERY_RATE_PER_KM,
  DELIVERY_FREE_KM,
  BUYER_FEE_RATE,
  SELLER_FEE_RATE,
  PRO_SELLER_FEE_RATE,
  DRIVER_FEE_RATE,
} from './delivery';

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
