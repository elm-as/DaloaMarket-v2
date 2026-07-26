export interface LatLng {
  latitude: number;
  longitude: number;
}

export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const aHav =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(aHav), Math.sqrt(1 - aHav));

  return R * c;
}

const DELIVERY_RATE_PER_KM = 85;
const DELIVERY_MIN = 500;
const DELIVERY_FREE_KM = 1.5;
const BUYER_FEE_RATE = 0.03;
const SELLER_FEE_RATE = 0.035;
const DRIVER_FEE_RATE = 0.10;

export function calculateDeliveryFee(distanceKm: number): number {
  const baseFee = DELIVERY_MIN;
  let extraFee = 0;
  if (distanceKm > DELIVERY_FREE_KM) {
    extraFee = Math.round((distanceKm - DELIVERY_FREE_KM) * DELIVERY_RATE_PER_KM);
  }
  return baseFee + extraFee;
}

export function calculateOrder(price: number, distanceKm: number, isProSeller: boolean = false) {
  const delivery = calculateDeliveryFee(distanceKm);
  
  const buyerFee = Math.round(price * BUYER_FEE_RATE);
  const sellerFeeRate = isProSeller ? 0.025 : SELLER_FEE_RATE;
  const sellerFee = Math.round(price * sellerFeeRate);
  const driverFee = Math.round(delivery * DRIVER_FEE_RATE);

  const total = price + delivery + buyerFee;
  const sellerAmount = price - sellerFee;
  const driverAmount = delivery - driverFee;

  return {
    price,
    distanceKm,
    delivery,
    buyerFee,
    sellerFee,
    driverFee,
    buyerFeeRate: BUYER_FEE_RATE,
    sellerFeeRate,
    driverFeeRate: DRIVER_FEE_RATE,
    total,
    sellerAmount,
    driverAmount,
  };
}
