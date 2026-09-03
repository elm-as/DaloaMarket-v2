import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Navigation, Clock, RefreshCw, Check } from 'lucide-react';
import {
  MAP_STYLES,
  type MapStyleMode,
  SELLER_MARKER,
  BUYER_MARKER,
  COURIER_MARKER,
  calculateRoute,
  type RouteInfo,
} from './mapStyles';

const DALOA_CENTER: [number, number] = [6.8773, -6.4502];
const DALOA_BOUNDS: [[number, number], [number, number]] = [
  [6.7900, -6.5580],
  [6.9580, -6.3420],
];

interface DaloaMapProps {
  sellerPosition?: [number, number];
  buyerPosition?: [number, number];
  deliveryPersonPosition?: [number, number];
  onRouteReady?: (info: RouteInfo) => void;
  className?: string;
  height?: string;
}

export default function DaloaMap({
  sellerPosition,
  buyerPosition,
  deliveryPersonPosition,
  onRouteReady,
  className = '',
  height = '420px',
}: DaloaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routeLayersRef = useRef<L.LayerGroup | null>(null);
  const courierMarkerRef = useRef<L.Marker | null>(null);

  const [currentStyle, setCurrentStyle] = useState<MapStyleMode>('streets');
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  // Appliquer une couche de tuiles selon le style choisi
  const applyTileLayer = useCallback((map: L.Map, styleKey: MapStyleMode) => {
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    const style = MAP_STYLES[styleKey] || MAP_STYLES.streets;
    const layer = L.tileLayer(style.url, {
      maxZoom: style.maxZoom,
      subdomains: style.subdomains,
      attribution: style.attribution,
    }).addTo(map);

    tileLayerRef.current = layer;
  }, []);

  // Initialisation de la carte Leaflet
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DALOA_CENTER,
      zoom: 14,
      minZoom: 12,
      maxBounds: L.latLngBounds(DALOA_BOUNDS[0], DALOA_BOUNDS[1]),
      maxBoundsViscosity: 0.9,
      zoomControl: false,
    });

    applyTileLayer(map, 'streets');

    // Groupe pour tracer l'itinéraire (double trait néon)
    const routeGroup = L.layerGroup().addTo(map);
    routeLayersRef.current = routeGroup;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      routeLayersRef.current = null;
    };
  }, [applyTileLayer]);

  // Changement dynamique de style de tuiles
  const handleSelectStyle = (mode: MapStyleMode) => {
    setCurrentStyle(mode);
    setStyleMenuOpen(false);
    if (mapRef.current) {
      applyTileLayer(mapRef.current, mode);
    }
  };

  // Ajuster la vue pour englober tous les points d'intérêt
  const fitAllPoints = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const points: [number, number][] = [];
    if (sellerPosition) points.push(sellerPosition);
    if (buyerPosition) points.push(buyerPosition);
    if (deliveryPersonPosition) points.push(deliveryPersonPosition);

    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.setView(DALOA_CENTER, 14);
    }
  }, [sellerPosition, buyerPosition, deliveryPersonPosition]);

  // Mise à jour des marqueurs et calcul de l'itinéraire
  useEffect(() => {
    const map = mapRef.current;
    const routeGroup = routeLayersRef.current;
    if (!map || !routeGroup) return;

    // Nettoyer les anciens marqueurs vendeurs et clients
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker && layer !== courierMarkerRef.current) {
        map.removeLayer(layer);
      }
    });
    routeGroup.clearLayers();

    if (sellerPosition) {
      L.marker(sellerPosition, { icon: SELLER_MARKER })
        .addTo(map)
        .bindPopup('<b>Boutique Vendeur</b><br>Point de départ');
    }

    if (buyerPosition) {
      L.marker(buyerPosition, { icon: BUYER_MARKER })
        .addTo(map)
        .bindPopup('<b>Point de livraison</b><br>Chez vous');
    }

    if (sellerPosition && buyerPosition) {
      fitAllPoints();
      setIsRouting(true);

      calculateRoute(sellerPosition, buyerPosition).then((info) => {
        setIsRouting(false);
        if (info && info.coordinates.length > 0) {
          // Double tracé professionnel style Uber / Apple Maps :
          // 1. Ligne de contour contrastée (casing)
          L.polyline(info.coordinates, {
            color: '#C2410C',
            weight: 7,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(routeGroup);

          // 2. Ligne centrale lumineuse (neon core)
          L.polyline(info.coordinates, {
            color: '#FDBA74',
            weight: 3.5,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(routeGroup);

          setRouteInfo(info);
          onRouteReady?.(info);
        } else {
          // Repli vol d'oiseau en pointillés si la route échoue
          L.polyline([sellerPosition, buyerPosition], {
            color: '#EA580C',
            weight: 3.5,
            opacity: 0.7,
            dashArray: '6, 8',
          }).addTo(routeGroup);
          setRouteInfo(null);
        }
      });
    }
  }, [sellerPosition, buyerPosition, onRouteReady, fitAllPoints]);

  // Mise à jour de la position du livreur
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (courierMarkerRef.current) {
      map.removeLayer(courierMarkerRef.current);
      courierMarkerRef.current = null;
    }

    if (deliveryPersonPosition) {
      const marker = L.marker(deliveryPersonPosition, { icon: COURIER_MARKER })
        .addTo(map)
        .bindPopup('<b>Livreur en direct</b><br>En cours de trajet');
      courierMarkerRef.current = marker;
    }
  }, [deliveryPersonPosition]);

  return (
    <section className={`overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl shadow-gray-200/50 ${className}`}>
      {/* ── EN-TÊTE DE LA CARTE ── */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 bg-gradient-to-r from-gray-50/90 to-orange-50/30">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">Cartographie Haute Définition</p>
            <p className="text-sm font-black text-gray-900">Réseau routier de Daloa</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRouting && (
            <span className="flex items-center gap-1 text-[11px] font-extrabold text-orange-600 bg-orange-100/80 px-2 py-0.5 rounded-full">
              <RefreshCw className="w-3 h-3 animate-spin" /> Calcul...
            </span>
          )}
          <button
            type="button"
            onClick={fitAllPoints}
            className="p-1.5 rounded-xl bg-white border border-gray-200/80 text-gray-600 hover:text-orange-600 shadow-2xs active:scale-95 transition-all"
            title="Recentrer sur le parcours"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── CONTENEUR CARTE ET CONTRÔLES FLOTTANTS ── */}
      <div className="relative">
        <div ref={containerRef} style={{ width: '100%', height }} className="overflow-hidden bg-gray-100" />

        {/* Sélecteur de style de tuiles (Menu déroulant flottant) */}
        <div className="absolute right-3 top-3 z-[450]">
          <button
            type="button"
            onClick={() => setStyleMenuOpen((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-2xl bg-white/95 px-3 py-1.5 text-xs font-black text-gray-800 shadow-lg backdrop-blur-md border border-gray-200/80 hover:bg-white active:scale-95 transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-orange-500" />
            <span>{MAP_STYLES[currentStyle].icon} {MAP_STYLES[currentStyle].label}</span>
          </button>

          {styleMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white/98 p-1.5 shadow-2xl backdrop-blur-lg border border-gray-200/80 flex flex-col gap-1 z-[500]">
              {(Object.keys(MAP_STYLES) as MapStyleMode[]).map((key) => {
                const opt = MAP_STYLES[key];
                const active = currentStyle === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectStyle(key)}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-extrabold transition-all text-left ${
                      active
                        ? 'bg-orange-50 text-orange-600 border border-orange-200/60 shadow-2xs'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </span>
                    {active && <Check className="w-3.5 h-3.5 text-orange-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Badge récapitulatif du trajet flottant en bas */}
        {routeInfo && (
          <div className="absolute left-3 bottom-3 right-3 z-[400] flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/95 backdrop-blur-md border border-gray-100 shadow-xl shadow-gray-900/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold shadow-md shadow-orange-500/30 flex-shrink-0">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400">Itinéraire estimé</p>
                <p className="text-sm font-black text-gray-900 leading-tight">
                  {routeInfo.distanceKm} km <span className="text-gray-300 font-normal">·</span> {routeInfo.timeMinutes} min
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/60 flex-shrink-0">
              <Clock className="w-3.5 h-3.5" />
              <span>Trajet direct</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
