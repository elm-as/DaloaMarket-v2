import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { LatLng } from '../../lib/pricing';
import { resolveBuyerPoint, resolveBillableDistanceKm } from '../../lib/daloaGeo';
import { calculateDeliveryFee } from '../../lib/delivery';
import { getOrderQuote, type ServerQuote } from '../../lib/payment';
import type { CartItem } from '../../contexts/CartContext';
import type {
  CartSellerPoint,
  CheckoutStep,
  DeliveryMode,
  ListingData,
  QuoteStatus,
} from './checkout.types';

interface RoutingAndQuoteParams {
  step: CheckoutStep;
  userId?: string;
  isOutOfZone: boolean;
  isCartMode: boolean;
  cartItems: CartItem[];
  listing: ListingData | null;
  requestedVariantId?: string;
  cartSellers: Map<string, CartSellerPoint>;
  buyerCoords: LatLng | null;
  sellerCoords: LatLng | null;
  deliveryMode: DeliveryMode;
  deliveryLatitude: number;
  deliveryLongitude: number;
  deliveryAddress: string;
}

export function useCheckoutRoutingAndQuote(params: RoutingAndQuoteParams) {
  const {
    step,
    userId,
    isOutOfZone,
    isCartMode,
    cartItems,
    listing,
    requestedVariantId,
    cartSellers,
    buyerCoords,
    sellerCoords,
    deliveryMode,
    deliveryLatitude,
    deliveryLongitude,
    deliveryAddress,
  } = params;

  const [distanceKm, setDistanceKm] = useState(0);
  const [routing, setRouting] = useState(false);
  const [deliveryFeesBySeller, setDeliveryFeesBySeller] = useState<Map<string, number>>(new Map());
  const [serverQuote, setServerQuote] = useState<ServerQuote | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<QuoteStatus>('idle');
  const [quoteNonce, setQuoteNonce] = useState(0);

  useEffect(() => {
    let active = true;

    const compute = async () => {
      const buyerPoint = resolveBuyerPoint(buyerCoords, null);
      if (isCartMode) {
        const bySeller = new Map<string, LatLng>();
        cartSellers.forEach((s) => {
          if (!bySeller.has(s.sellerId)) {
            bySeller.set(s.sellerId, { latitude: s.lat, longitude: s.lng });
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

  const quoteItemsKey = JSON.stringify(
    isCartMode
      ? cartItems.map((ci) => [ci.listing_id, ci.variant_id || null, ci.quantity])
      : listing
        ? [[listing.id, requestedVariantId || null, 1]]
        : []
  );

  useEffect(() => {
    if (step !== 3 || !userId || isOutOfZone) return;
    const items = (JSON.parse(quoteItemsKey) as [string, string | null, number][]).map(
      ([listing_id, variant_id, quantity]) => ({ listing_id, variant_id, quantity })
    );
    if (items.length === 0) return;

    let active = true;
    setQuoteStatus('loading');
    const timer = setTimeout(() => {
      getOrderQuote(items, {
        deliveryMode,
        deliveryLat: deliveryLatitude,
        deliveryLng: deliveryLongitude,
        deliveryAddress: deliveryMode === 'pickup' ? 'Retrait en boutique' : deliveryAddress || 'Daloa',
      })
        .then((q) => {
          if (!active) return;
          setServerQuote(q);
          setQuoteStatus('ready');
        })
        .catch((err: Error & { reason?: string }) => {
          if (!active) return;
          setServerQuote(null);
          if (err.reason) {
            setQuoteStatus('error');
            toast.error(err.message || 'Impossible de calculer le prix.');
          } else {
            setQuoteStatus('fallback');
          }
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    step,
    userId,
    isOutOfZone,
    quoteItemsKey,
    deliveryMode,
    deliveryLatitude,
    deliveryLongitude,
    deliveryAddress,
    quoteNonce,
  ]);

  return {
    distanceKm,
    routing,
    deliveryFeesBySeller,
    serverQuote,
    quoteStatus,
    bumpQuoteNonce: () => setQuoteNonce((n) => n + 1),
  };
}
