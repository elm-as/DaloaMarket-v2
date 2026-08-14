import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DALOA_CENTER: [number, number] = [6.8773, -6.4502];
const DALOA_BOUNDS: [[number, number], [number, number]] = [
  [6.7900, -6.5580],
  [6.9580, -6.3420],
];

interface RouteInfo {
  distanceKm: number;
  timeMinutes: number;
}

interface DaloaMapProps {
  sellerPosition?: [number, number];
  buyerPosition?: [number, number];
  deliveryPersonPosition?: [number, number];
  onRouteReady?: (info: RouteInfo) => void;
  className?: string;
  height?: string;
}

function createMarkerIcon(color: string, symbol: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      background:${color};
      width:32px;height:32px;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      border:3px solid white;
      color:white;
      font-weight:700;
      font-size:14px;
      font-family:system-ui,-apple-system,sans-serif;
    ">${symbol}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

const SELLER_ICON = createMarkerIcon('#FF7F00', 'V');
const BUYER_ICON = createMarkerIcon('#2563EB', 'A');
const COURIER_ICON = createMarkerIcon('#10B981', 'L');

export default function DaloaMap({
  sellerPosition,
  buyerPosition,
  deliveryPersonPosition,
  onRouteReady,
  className = '',
  height = '400px',
}: DaloaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const courierMarkerRef = useRef<L.Marker | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DALOA_CENTER,
      zoom: 14,
      minZoom: 13,
      maxBounds: L.latLngBounds(DALOA_BOUNDS[0], DALOA_BOUNDS[1]),
      maxBoundsViscosity: 1.0,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker && layer !== courierMarkerRef.current) {
        map.removeLayer(layer);
      }
    });
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (sellerPosition) {
      L.marker(sellerPosition, { icon: SELLER_ICON })
        .addTo(map)
        .bindPopup('Vendeur');
    }

    if (buyerPosition) {
      L.marker(buyerPosition, { icon: BUYER_ICON })
        .addTo(map)
        .bindPopup('Chez vous');
    }

    if (sellerPosition && buyerPosition) {
      const bounds = L.latLngBounds([sellerPosition, buyerPosition]);
      if (deliveryPersonPosition) {
        bounds.extend(deliveryPersonPosition);
      }
      map.fitBounds(bounds, { padding: [40, 40] });

      fetch(
        `https://router.project-osrm.org/route/v1/driving/${sellerPosition[1]},${sellerPosition[0]};${buyerPosition[1]},${buyerPosition[0]}?overview=full&geometries=geojson`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const coords = route.geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]] as [number, number]
            );
            const polyline = L.polyline(coords, {
              color: '#FF7F00',
              weight: 5,
              opacity: 0.8,
            }).addTo(map);
            routeLayerRef.current = polyline;

            const info: RouteInfo = {
              distanceKm: Math.round((route.distance / 1000) * 10) / 10,
              timeMinutes: Math.round(route.duration / 60),
            };
            setRouteInfo(info);
            onRouteReady?.(info);
          }
        })
        .catch(() => {
          const polyline = L.polyline([sellerPosition, buyerPosition], {
            color: '#FF7F00',
            weight: 3,
            opacity: 0.5,
            dashArray: '8 8',
          }).addTo(map);
          routeLayerRef.current = polyline;
          setRouteInfo(null);
        });
    }
  }, [sellerPosition, buyerPosition, deliveryPersonPosition, onRouteReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (courierMarkerRef.current) {
      map.removeLayer(courierMarkerRef.current);
      courierMarkerRef.current = null;
    }

    if (deliveryPersonPosition) {
      const marker = L.marker(deliveryPersonPosition, { icon: COURIER_ICON })
        .addTo(map)
        .bindPopup('Livreur en mouvement');
      courierMarkerRef.current = marker;
    }
  }, [deliveryPersonPosition]);

  return (
    <section className={`overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-lg shadow-gray-200/50 ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-500">Suivi de livraison</p>
          <p className="text-sm font-extrabold text-gray-900">Itinéraire à Daloa</p>
        </div>
        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-extrabold text-orange-700">En direct</span>
      </div>
      <div className="relative">
        <div ref={containerRef} style={{ width: '100%', height }} className="overflow-hidden" />
        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-gray-700 shadow-sm backdrop-blur">
          Vendeur · Vous · Livreur
        </div>
      </div>
      {routeInfo && (
        <div className="flex items-center justify-center gap-4 mt-2 px-4 py-2.5 bg-white/90 backdrop-blur rounded-xl text-sm">
          <span className="text-[var(--color-on-surface)]">
            Distance <strong>{routeInfo.distanceKm} km</strong>
          </span>
          <span className="text-[var(--color-on-surface)]">
            Temps estimé <strong>{routeInfo.timeMinutes} min</strong>
          </span>
        </div>
      )}
    </section>
  );
}
