import { haversineDistance, type LatLng } from './delivery';
import { isLocationInDaloa, DALOA_CENTER_COORDS } from './utils';

/**
 * Résolution des positions et de la distance facturable — copie web de la règle
 * unique (référence : packages/utils/src/quote.ts et packages/config/src/pricing.ts).
 *
 * Le web n'est pas dans le workspace pnpm, cette duplication est assumée ; le
 * test de parité casse si les barèmes divergent. Ce module existe parce que le
 * checkout web n'avait AUCUN repli : sans GPS boutique, la distance tombait à
 * 0 km et la livraison était affichée à 500 FCFA pendant que le serveur
 * facturait la vraie distance.
 */

export const DISTANCE_RULE = {
  minKm: 0.5,
  maxKm: 15,
  roadFactor: 1.3,
};

/** Barycentres des quartiers de Daloa (miroir de DALOA_DISTRICT_COORDINATES). */
export const DALOA_DISTRICT_COORDINATES: Record<string, LatLng> = {
  'Tazibouo': { latitude: 6.8795, longitude: -6.4488 },
  'Balouzon': { latitude: 6.9044, longitude: -6.4234 },
  'Lobia': { latitude: 6.8977, longitude: -6.4492 },
  'Abattoir': { latitude: 6.8611, longitude: -6.4341 },
  'Commerce': { latitude: 6.8900, longitude: -6.4449 },
  'Centre-ville': { latitude: 6.8850, longitude: -6.4470 },
  'Kennedy': { latitude: 6.8835, longitude: -6.4520 },
  'Gbokora': { latitude: 6.9147, longitude: -6.4484 },
  'Huberson': { latitude: 6.8811, longitude: -6.4658 },
  'Suisse': { latitude: 6.8724, longitude: -6.4432 },
  'Belle-ville': { latitude: 6.8750, longitude: -6.4579 },
  'Millionnaire': { latitude: 6.8883, longitude: -6.4558 },
  'Odjenecourani': { latitude: 6.8689, longitude: -6.4500 },
  'Institut Pastoral': { latitude: 6.9027, longitude: -6.4406 },
  'Palmeraie': { latitude: 6.8784, longitude: -6.4514 },
  'Orly': { latitude: 6.8710, longitude: -6.4560 },
  'Dioulabougou': { latitude: 6.8850, longitude: -6.4480 },
  'Quartier Baoulé': { latitude: 6.8792, longitude: -6.4565 },
  'Savonnerie': { latitude: 6.8730, longitude: -6.4510 },
  'Évêché': { latitude: 6.8800, longitude: -6.4450 },
  'Garage': { latitude: 6.8870, longitude: -6.4580 },
  'Soleil': { latitude: 6.8920, longitude: -6.4380 },
  'Texas': { latitude: 6.8760, longitude: -6.4460 },
  'Labia': { latitude: 6.8910, longitude: -6.4510 },
  'Fadiga': { latitude: 6.8820, longitude: -6.4490 },
  'Marin': { latitude: 6.8840, longitude: -6.4550 },
  'Cissoko': { latitude: 6.8780, longitude: -6.4440 },
  'Gbeulville': { latitude: 6.8830, longitude: -6.4390 },
  'Cafop': { latitude: 6.8690, longitude: -6.4620 },
  'Koyakabougou': { latitude: 6.8950, longitude: -6.4520 },
  'Liberia': { latitude: 6.8740, longitude: -6.4380 },
  'Manioc': { latitude: 6.8670, longitude: -6.4460 },
  'Mossibougou': { latitude: 6.8880, longitude: -6.4410 },
  'Sapia': { latitude: 6.9080, longitude: -6.4350 },
  'Wolof': { latitude: 6.8860, longitude: -6.4450 },
  'Tagoura': { latitude: 6.9150, longitude: -6.4380 },
  'Tapeguhe': { latitude: 6.8600, longitude: -6.4550 },
};

export function clampBillableDistanceKm(distanceKm: number): number {
  if (!Number.isFinite(distanceKm)) return DISTANCE_RULE.minKm;
  return Math.min(
    DISTANCE_RULE.maxKm,
    Math.max(DISTANCE_RULE.minKm, Math.round(distanceKm * 10) / 10)
  );
}

const center = (): LatLng => ({
  latitude: DALOA_CENTER_COORDS.lat,
  longitude: DALOA_CENTER_COORDS.lng,
});

const usableGps = (lat?: number | null, lng?: number | null): LatLng | null => {
  if (lat == null || lng == null) return null;
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null;
  if (!isLocationInDaloa(Number(lat), Number(lng))) return null;
  return { latitude: Number(lat), longitude: Number(lng) };
};

const districtPoint = (district?: string | null): LatLng | null =>
  district ? DALOA_DISTRICT_COORDINATES[district] || null : null;

/** GPS boutique → barycentre du quartier déclaré → centre de Daloa. */
export function resolveSellerPoint(seller: {
  shop_latitude?: number | null;
  shop_longitude?: number | null;
  district?: string | null;
} | null | undefined): LatLng {
  if (!seller) return center();
  return (
    usableGps(seller.shop_latitude, seller.shop_longitude) ||
    districtPoint(seller.district) ||
    center()
  );
}

/** GPS saisi → barycentre du quartier choisi → centre de Daloa. */
export function resolveBuyerPoint(
  coords?: LatLng | null,
  district?: string | null
): LatLng {
  return (
    usableGps(coords?.latitude, coords?.longitude) ||
    districtPoint(district) ||
    center()
  );
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

/**
 * Distance facturable : itinéraire routier réel (Mapbox puis OSRM), à défaut le
 * vol d'oiseau majoré. Même cascade que les applications et le serveur.
 */
/** Itinéraires déjà calculés, pour ne pas réinterroger Mapbox/OSRM au même point. */
const routeCache = new Map<string, number>();

export async function resolveBillableDistanceKm(
  origin: LatLng,
  destination: LatLng
): Promise<number> {
  const key = [origin.latitude, origin.longitude, destination.latitude, destination.longitude]
    .map((v) => v.toFixed(4))
    .join(',');
  const cached = routeCache.get(key);
  if (cached != null) return cached;
  const km = await computeBillableDistanceKm(origin, destination);
  routeCache.set(key, km);
  return km;
}

async function computeBillableDistanceKm(origin: LatLng, destination: LatLng): Promise<number> {
  const straight = haversineDistance(origin, destination);

  if (MAPBOX_TOKEN) {
    try {
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/driving/` +
        `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
        `?overview=false&access_token=${MAPBOX_TOKEN}`;
      const res = await fetchWithTimeout(url, 3000);
      if (res.ok) {
        const data = await res.json();
        const route = data?.routes?.[0];
        if (route?.distance > 0) return clampBillableDistanceKm(route.distance / 1000);
      }
    } catch {
      /* repli OSRM */
    }
  }

  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=false`;
    const res = await fetchWithTimeout(url, 2500);
    if (res.ok) {
      const data = await res.json();
      const route = data?.routes?.[0];
      if (route?.distance > 0) return clampBillableDistanceKm(route.distance / 1000);
    }
  } catch {
    /* repli géométrique */
  }

  return clampBillableDistanceKm(straight * DISTANCE_RULE.roadFactor);
}
