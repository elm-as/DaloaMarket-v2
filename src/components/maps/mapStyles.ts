import L from 'leaflet';

export interface RouteInfo {
  distanceKm: number;
  timeMinutes: number;
  coordinates: [number, number][];
}

export const MAP_STYLE_MODES = ['streets', 'navigation', 'satellite', 'voyager'] as const;
export type MapStyleMode = (typeof MAP_STYLE_MODES)[number];

export interface MapStyleOption {
  id: MapStyleMode;
  label: string;
  icon: string;
  url: string;
  subdomains: string;
  maxZoom: number;
  attribution: string;
}

const MAPBOX_TOKEN = (import.meta as any).env?.VITE_MAPBOX_TOKEN || '';

/**
 * Tuiles cartographiques premium HD
 * - Mapbox Streets v12 Retina (@2x) : rendu de référence moderne
 * - Mapbox Navigation Day (@2x) : fort contraste conçu pour la livraison
 * - Mapbox Satellite Streets (@2x) : imagerie satellite avec routes vectorielles
 * - CartoDB Voyager (@2x) : rendu pastel épuré style Apple Maps (100% autonome sans clé)
 */
export const MAP_STYLES: Record<MapStyleMode, MapStyleOption> = {
  streets: {
    id: 'streets',
    label: 'Rues HD',
    icon: '🗺️',
    url: MAPBOX_TOKEN
      ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 20,
    attribution: MAPBOX_TOKEN
      ? '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; OpenStreetMap'
      : '&copy; CARTO &copy; OpenStreetMap contributors',
  },
  navigation: {
    id: 'navigation',
    label: 'Livraison',
    icon: '🛵',
    url: MAPBOX_TOKEN
      ? `https://api.mapbox.com/styles/v1/mapbox/navigation-day-v1/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 20,
    attribution: MAPBOX_TOKEN
      ? '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; OpenStreetMap'
      : '&copy; CARTO &copy; OpenStreetMap contributors',
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    icon: '🛰️',
    url: MAPBOX_TOKEN
      ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    subdomains: 'abcd',
    maxZoom: 19,
    attribution: MAPBOX_TOKEN
      ? '&copy; Mapbox &copy; Maxar'
      : '&copy; Esri &copy; Maxar, Earthstar Geographics',
  },
  voyager: {
    id: 'voyager',
    label: 'Pastel',
    icon: '🎨',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 20,
    attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
  },
};

/**
 * Créateur de marqueur premium avec forme goutte d'eau, icône et badge de rôle
 */
export function createModernMarker(
  symbol: string,
  label: string,
  gradient: string,
  glowColor: string
): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="
          position: absolute;
          top: 6px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${glowColor};
          opacity: 0.45;
          filter: blur(5px);
          pointer-events: none;
        "></div>
        <div style="
          position: relative;
          width: 38px;
          height: 38px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: ${gradient};
          border: 2.5px solid #FFFFFF;
          box-shadow: 0 4px 14px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span style="
            transform: rotate(45deg);
            font-size: 16px;
            line-height: 1;
            user-select: none;
          ">${symbol}</span>
        </div>
        <div style="
          margin-top: 3px;
          background: rgba(17, 24, 39, 0.88);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          color: #FFFFFF;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.02em;
          padding: 2px 7px;
          border-radius: 7px;
          white-space: nowrap;
          border: 1px solid rgba(255,255,255,0.25);
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          user-select: none;
        ">${label}</div>
      </div>
    `,
    className: 'daloa-premium-marker',
    iconSize: [80, 62],
    iconAnchor: [40, 40],
    popupAnchor: [0, -40],
  });
}

export const SELLER_MARKER = createModernMarker(
  '🏪',
  'Vendeur',
  'linear-gradient(135deg, #FF8A00, #EA580C)',
  'rgba(234, 88, 12, 0.7)'
);

export const BUYER_MARKER = createModernMarker(
  '📍',
  'Client',
  'linear-gradient(135deg, #3B82F6, #1D4ED8)',
  'rgba(37, 99, 235, 0.7)'
);

export const COURIER_MARKER = createModernMarker(
  '🛵',
  'Livreur',
  'linear-gradient(135deg, #10B981, #059669)',
  'rgba(16, 185, 129, 0.7)'
);

/**
 * Calcul d'itinéraire routier avec Mapbox Directions puis repli OSRM
 */
export async function calculateRoute(
  start: [number, number],
  end: [number, number]
): Promise<RouteInfo | null> {
  // 1. Essai Mapbox Directions API (haute précision routière)
  if (MAPBOX_TOKEN) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[1]},${start[0]};${end[1]},${end[0]}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const r = data.routes[0];
          return {
            coordinates: r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]),
            distanceKm: Math.round((r.distance / 1000) * 10) / 10,
            timeMinutes: Math.max(1, Math.round(r.duration / 60)),
          };
        }
      }
    } catch (e) {
      console.warn('[Mapbox Route] Repli vers OSRM :', e);
    }
  }

  // 2. Repli OSRM (Open Source Routing Machine)
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const r = data.routes[0];
        return {
          coordinates: r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]),
          distanceKm: Math.round((r.distance / 1000) * 10) / 10,
          timeMinutes: Math.max(1, Math.round(r.duration / 60)),
        };
      }
    }
  } catch (e) {
    console.warn('[OSRM Route] Échec :', e);
  }

  return null;
}
