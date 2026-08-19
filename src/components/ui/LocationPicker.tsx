import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Store, Truck, CheckCircle2, X, AlertCircle, Layers, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useSupabase } from "../../hooks/useSupabase";
import { isLocationInDaloa, getDistanceFromDaloaCenterKm, DALOA_CENTER_COORDS } from "../../lib/utils";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const customPinIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 38px; height: 46px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute;
        bottom: 2px;
        left: 50%;
        transform: translateX(-50%);
        width: 16px;
        height: 6px;
        background: rgba(0,0,0,0.32);
        border-radius: 50%;
        filter: blur(1.5px);
      "></div>
      <div style="
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, #FF8A00, #FF5500);
        border: 3px solid #FFFFFF;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 6px 16px rgba(255, 85, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        "></div>
      </div>
    </div>
  `,
  className: 'custom-location-pin',
  iconSize: [38, 46],
  iconAnchor: [19, 44],
  popupAnchor: [0, -42],
});

// Tile Layer URLs
const TILE_URL_STREET = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_URL_SATELLITE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationChange: (lat: number, lng: number) => void;
  placeholder?: string;
  readOnly?: boolean;
  zoom?: number;
  className?: string;
  userType?: 'seller' | 'buyer';
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  initialLat,
  initialLng,
  onLocationChange,
  placeholder = "Cliquez sur la carte pour définir la position",
  readOnly = false,
  zoom = 14,
  className,
  userType = 'buyer',
}) => {
  const { userProfile, isAdmin } = useSupabase();
  const isSuperOrAdmin = isAdmin || userProfile?.role === 'superadmin' || userProfile?.role === 'admin';

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  
  const [lat, setLat] = useState(initialLat ?? DALOA_CENTER_COORDS.lat);
  const [lng, setLng] = useState(initialLng ?? DALOA_CENTER_COORDS.lng);
  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapMode, setMapMode] = useState<'street' | 'satellite'>('street');

  // État de la modal de confirmation
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (initialLat != null && initialLng != null) {
      setLat(initialLat);
      setLng(initialLng);
      if (mapRef.current && markerRef.current) {
        const markerLatLng = markerRef.current.getLatLng();
        if (markerLatLng.lat !== initialLat || markerLatLng.lng !== initialLng) {
          markerRef.current.setLatLng([initialLat, initialLng]);
          mapRef.current.setView([initialLat, initialLng], zoom);
        }
      }
    }
  }, [initialLat, initialLng, zoom]);

  useEffect(() => {
    if (mapReady && mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [mapReady]);

  // Initialisation de la carte
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom,
      zoomControl: false, // On garde les contrôles propres
      attributionControl: false,
    });

    // Style par défaut : CARTO Voyager
    const initialLayer = L.tileLayer(TILE_URL_STREET, {
      maxZoom: 20,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);

    tileLayerRef.current = initialLayer;

    const marker = L.marker([lat, lng], {
      draggable: !readOnly,
      icon: customPinIcon,
    }).addTo(map);

    if (!readOnly) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat: newLat, lng: newLng } = e.latlng;
        
        // Pour les vendeurs, vérifier si le point cliqué est dans Daloa (sauf si admin)
        if (userType === 'seller' && !isLocationInDaloa(newLat, newLng) && !isSuperOrAdmin) {
          toast.error("Veuillez sélectionner un emplacement situé à Daloa (Côte d'Ivoire).", { icon: "🚫" });
          return;
        }

        marker.setLatLng([newLat, newLng]);
        setLat(newLat);
        setLng(newLng);
        onLocationChange(newLat, newLng);
      });

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        if (userType === 'seller' && !isLocationInDaloa(pos.lat, pos.lng) && !isSuperOrAdmin) {
          toast.error("Emplacement hors de Daloa. DaloaMarket est réservé aux vendeurs locaux.", { icon: "🚫" });
          // Replacer au dernier point valide
          marker.setLatLng([lat, lng]);
          return;
        }
        setLat(pos.lat);
        setLng(pos.lng);
        onLocationChange(pos.lat, pos.lng);
      });
    }

    mapRef.current = map;
    markerRef.current = marker;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Bascule Mode Plan (Voyager) / Satellite HD (Esri)
  const toggleMapMode = () => {
    if (!mapRef.current) return;
    const newMode = mapMode === 'street' ? 'satellite' : 'street';
    setMapMode(newMode);

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    if (newMode === 'satellite') {
      tileLayerRef.current = L.tileLayer(TILE_URL_SATELLITE, {
        maxZoom: 19,
        attribution: '&copy; Esri &copy; Maxar, Earthstar Geographics',
      }).addTo(mapRef.current);
      toast("Mode Satellite HD activé", { icon: "🛰️", duration: 2500 });
    } else {
      tileLayerRef.current = L.tileLayer(TILE_URL_STREET, {
        maxZoom: 20,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap &copy; CARTO',
      }).addTo(mapRef.current);
      toast("Mode Plan Street activé", { icon: "🗺️", duration: 2500 });
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocating(false);
        setPendingCoords({ lat: latitude, lng: longitude });
        setShowConfirmModal(true);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Accès GPS refusé. Activez la localisation dans les paramètres de votre navigateur.");
        } else {
          toast.error("Impossible de récupérer votre position GPS.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleConfirmLocation = () => {
    if (!pendingCoords) return;
    const { lat: newLat, lng: newLng } = pendingCoords;

    const inDaloa = isLocationInDaloa(newLat, newLng);

    // Blocage pour les non-admins si vendeur hors Daloa
    if (userType === 'seller' && !inDaloa && !isSuperOrAdmin) {
      toast.error("Impossible d'enregistrer une boutique en dehors de Daloa.", { icon: "🚫" });
      return;
    }

    setLat(newLat);
    setLng(newLng);
    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([newLat, newLng], zoom);
      markerRef.current.setLatLng([newLat, newLng]);
    }
    onLocationChange(newLat, newLng);
    setShowConfirmModal(false);
    setPendingCoords(null);

    if (userType === 'seller') {
      if (isSuperOrAdmin && !inDaloa) {
        toast.success("Position enregistrée (Mode Admin / Test hors-Daloa)", { icon: "👑", duration: 4000 });
      } else {
        toast.success("Emplacement de votre boutique mis à jour !", { icon: "🏪", duration: 4000 });
      }
    } else {
      toast.success("Point de livraison défini avec succès !", { icon: "📍", duration: 4000 });
    }
  };

  const handleCancelLocation = () => {
    setShowConfirmModal(false);
    setPendingCoords(null);
  };

  // Calcul du diagnostic géographique pour la modale
  const isPendingInDaloa = pendingCoords ? isLocationInDaloa(pendingCoords.lat, pendingCoords.lng) : true;
  const distanceFromCenter = pendingCoords ? getDistanceFromDaloaCenterKm(pendingCoords.lat, pendingCoords.lng) : 0;
  const isBlocked = userType === 'seller' && !isPendingInDaloa && !isSuperOrAdmin;

  return (
    <div className="space-y-2 relative">
      <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-lg shadow-gray-200/50">
        {/* Badge en haut à gauche */}
        <div className="absolute left-3 top-3 z-[400] flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-extrabold text-gray-800 shadow-sm backdrop-blur pointer-events-none border border-gray-100">
          {userType === 'seller' ? (
            <>
              <Store className="h-3.5 w-3.5 text-orange-500" />
              Emplacement boutique Daloa
            </>
          ) : (
            <>
              <MapPin className="h-3.5 w-3.5 text-orange-500" />
              Point de livraison Daloa
            </>
          )}
        </div>

        {/* Bouton de bascule Mode Satellite / Plan en haut à droite */}
        <button
          type="button"
          onClick={toggleMapMode}
          className="absolute right-3 top-3 z-[400] flex items-center gap-1.5 rounded-2xl bg-white/95 px-3 py-1.5 text-[11px] font-extrabold text-gray-800 shadow-md backdrop-blur border border-gray-100 hover:bg-white active:scale-95 transition-all"
          title="Changer de vue cartographique"
        >
          <Layers className="w-3.5 h-3.5 text-orange-500" />
          <span>{mapMode === 'street' ? '🛰️ Satellite' : '🗺️ Plan'}</span>
        </button>

        {/* Conteneur de la carte */}
        <div
          ref={containerRef}
          className={className || "w-full h-56 bg-gray-100"}
          style={{ zIndex: 0 }}
        />

        {/* Bouton GPS Me localiser en bas à droite */}
        {!readOnly && (
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating}
            className="absolute bottom-3 right-3 z-[400] flex min-h-10 items-center gap-2 rounded-2xl border border-gray-100 bg-white/95 px-3.5 py-2 text-xs font-extrabold text-gray-900 shadow-lg backdrop-blur-md transition-all hover:bg-white active:scale-95 disabled:opacity-50"
          >
            <Navigation className={`w-3.5 h-3.5 text-orange-500 fill-orange-500 ${locating ? 'animate-spin' : ''}`} />
            {locating ? "Recherche satellite..." : "Ma position GPS"}
          </button>
        )}
      </div>

      {/* Coordonnées & aide sous la carte */}
      <div className="flex items-start justify-between gap-3 px-1 text-[11px] font-medium text-gray-500">
        <span className="flex shrink-0 items-center gap-1 font-bold text-gray-700">
          <MapPin className="h-3.5 w-3.5 text-orange-500" />
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </span>
        <span className="text-[11px] text-gray-400">{placeholder}</span>
      </div>

      {/* ── MODALE DE CONFIRMATION DE POSITION GPS + GEOFENCING ── */}
      <AnimatePresence>
        {showConfirmModal && pendingCoords && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelLocation}
            />

            {/* Modal Card */}
            <motion.div
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 overflow-hidden text-center z-10"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            >
              {/* Bouton fermeture */}
              <button
                type="button"
                onClick={handleCancelLocation}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icône principale */}
              <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg mb-4 text-white ${
                isBlocked
                  ? 'bg-gradient-to-tr from-red-500 to-rose-600 shadow-red-500/25'
                  : 'bg-gradient-to-tr from-orange-500 to-amber-500 shadow-orange-500/25'
              }`}>
                {isBlocked ? (
                  <AlertCircle className="w-7 h-7" />
                ) : userType === 'seller' ? (
                  <Store className="w-7 h-7" />
                ) : (
                  <Truck className="w-7 h-7" />
                )}
              </div>

              {/* Titre & Message selon le cas */}
              {isBlocked ? (
                <>
                  <h3 className="text-lg font-black text-gray-900 mb-2 leading-tight">
                    Position hors de Daloa
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed mb-4">
                    Votre position GPS actuelle est située à environ <strong>{Math.round(distanceFromCenter)} km</strong> de Daloa.
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 text-left mb-5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-red-900">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>Règle de proximité DaloaMarket :</span>
                    </div>
                    <p className="text-[11px] text-red-800 leading-tight">
                      DaloaMarket est une marketplace locale 100% dédiée à la ville de Daloa. Seuls les commerçants et artisans physiquement basés à Daloa peuvent ouvrir une boutique.
                    </p>
                  </div>
                </>
              ) : userType === 'seller' ? (
                <>
                  <h3 className="text-lg font-black text-gray-900 mb-2 leading-tight">
                    Définir l'emplacement de votre boutique ?
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed mb-4">
                    Vous êtes sur le point d'enregistrer votre position GPS comme l'adresse officielle de votre boutique à Daloa.
                  </p>
                  
                  {/* Badge Admin bypass si applicable */}
                  {isSuperOrAdmin && !isPendingInDaloa && (
                    <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 text-left mb-4 flex items-start gap-2 text-purple-900 text-[11px]">
                      <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold">Mode Fondateur / Admin actif</p>
                        <p className="text-purple-700 leading-tight">
                          Position détectée hors Daloa ({Math.round(distanceFromCenter)} km), exception accordée pour vos tests.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-orange-50/80 border border-orange-200/70 rounded-2xl p-3 text-left mb-5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-orange-900">
                      <AlertCircle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span>Impact sur vos ventes :</span>
                    </div>
                    <p className="text-[11px] text-orange-800 leading-tight pl-5">
                      Les frais de livraison et les trajets des coursiers DaloaDelivery seront calculés à partir de cet endroit.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-black text-gray-900 mb-2 leading-tight">
                    Confirmer ce lieu de livraison ?
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed mb-4">
                    Votre position GPS actuelle sera utilisée comme repère exact pour la livraison de votre commande à Daloa.
                  </p>
                  <div className="bg-blue-50/80 border border-blue-200/70 rounded-2xl p-3 text-left mb-5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-blue-900">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Précision pour le livreur :</span>
                    </div>
                    <p className="text-[11px] text-blue-800 leading-tight pl-5">
                      Assurez-vous d'être présent à cet emplacement ou complétez le champ texte avec vos repères de quartier.
                    </p>
                  </div>
                </>
              )}

              {/* Badge coordonnées */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-[11px] font-bold text-gray-700 mb-6">
                <span className={`w-2 h-2 rounded-full ${isPendingInDaloa ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>GPS : {pendingCoords.lat.toFixed(5)}, {pendingCoords.lng.toFixed(5)}</span>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {!isBlocked ? (
                  <button
                    type="button"
                    onClick={handleConfirmLocation}
                    className="w-full h-11 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {userType === 'seller' ? "Confirmer la position de ma boutique" : "Confirmer mon adresse de livraison"}
                    </span>
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleCancelLocation}
                  className="w-full h-10 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs active:scale-95 transition-all"
                >
                  {isBlocked ? "Fermer" : "Annuler"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { LocationPicker };
export default LocationPicker;


