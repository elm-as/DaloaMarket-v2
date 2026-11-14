import {
  calculateOrder,
  calculateDeliveryFee,
  haversineDistance,
  type CalculateOrderInput,
  type LatLng,
} from './delivery';

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

/**
 * Calcule le détail tarifaire d'une commande à partir d'un objet d'entrée typé.
 * @param input Paramètres de tarification (prix produit, distance, statut vendeur pro).
 */
export function calculateOrderPricing(input: CalculateOrderInput) {
  return calculateOrder(input);
}

export { haversineDistance, calculateDeliveryFee, calculateOrder };
export type { CalculateOrderInput, LatLng };
