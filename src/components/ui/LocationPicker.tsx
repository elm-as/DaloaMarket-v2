import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Layers } from "lucide-react";
import toast from "react-hot-toast";
import { useSupabase } from "../../hooks/useSupabase";
import { isLocationInDaloa, getDistanceFromDaloaCenterKm, DALOA_CENTER_COORDS } from "../../lib/utils";
import LocationSearchInput from "./LocationSearchInput";
import type { LocationSearchResult } from "./LocationSearchInput";
import LocationConfirmModal from "./LocationConfirmModal";
import { customLocationPinIcon } from "./map-pin";

const MAPBOX_TOKEN = (import.meta as any).env?.VITE_MAPBOX_TOKEN || '';

const TILE_URL_STREET = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

const TILE_URL_SATELLITE = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

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
  placeholder = "Cliquez sur la carte ou recherchez pour affiner la position",
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

  // Initialisation de la carte avec fond Mapbox Streets HD ou CartoDB Voyager
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Éviter le crash React 18 StrictMode "Map container is already initialized"
    if ((containerRef.current as any)._leaflet_id) {
      delete (containerRef.current as any)._leaflet_id;
    }

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom,
      zoomControl: false,
      attributionControl: false,
    });

    const initialLayer = L.tileLayer(TILE_URL_STREET, {
      maxZoom: 20,
      subdomains: 'abcd',
      attribution: MAPBOX_TOKEN ? '&copy; Mapbox' : '&copy; CARTO',
    }).addTo(map);

    tileLayerRef.current = initialLayer;

    const marker = L.marker([lat, lng], {
      draggable: !readOnly,
      icon: customLocationPinIcon,
    }).addTo(map);

    if (!readOnly) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat: newLat, lng: newLng } = e.latlng;
        
        if (userType === 'seller' && !isLocationInDaloa(newLat, newLng) && !isSuperOrAdmin) {
          toast.error("Veuillez sélectionner un emplacement situé à Daloa (Côte d'Ivoire).", { icon: "🚫" });
          return;
        }

        setLat(newLat);
        setLng(newLng);
        marker.setLatLng([newLat, newLng]);
        onLocationChange(newLat, newLng);
      });

      marker.on("dragend", () => {
        const position = marker.getLatLng();
        
        if (userType === 'seller' && !isLocationInDaloa(position.lat, position.lng) && !isSuperOrAdmin) {
          toast.error("Emplacement déplacé hors de Daloa. Replacé au centre.", { icon: "⚠️" });
          marker.setLatLng([lat, lng]);
          return;
        }

        setLat(position.lat);
        setLng(position.lng);
        onLocationChange(position.lat, position.lng);
      });
    }

    mapRef.current = map;
    markerRef.current = marker;
    setMapReady(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (containerRef.current && (containerRef.current as any)._leaflet_id) {
        delete (containerRef.current as any)._leaflet_id;
      }
      markerRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Bascule Mode Plan (Mapbox / CartoDB HD) / Satellite HD
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
        subdomains: 'abcd',
        attribution: MAPBOX_TOKEN ? '&copy; Mapbox &copy; Maxar' : '&copy; Esri &copy; Maxar',
      }).addTo(mapRef.current);
      toast("Mode Satellite HD activé", { icon: "🛰️", duration: 2000 });
    } else {
      tileLayerRef.current = L.tileLayer(TILE_URL_STREET, {
        maxZoom: 20,
        subdomains: 'abcd',
        attribution: MAPBOX_TOKEN ? '&copy; Mapbox' : '&copy; CARTO',
      }).addTo(mapRef.current);
      toast("Mode Plan HD activé", { icon: "🗺️", duration: 2000 });
    }
  };

  // Sélection d'un quartier ou d'une ville depuis la recherche
  const handleSearchResult = (result: LocationSearchResult) => {
    if (!mapRef.current || !markerRef.current) return;

    if (userType === 'seller' && !isLocationInDaloa(result.lat, result.lng) && !isSuperOrAdmin) {
      toast.error("Emplacement hors de Daloa. DaloaMarket est réservé aux vendeurs locaux.", { icon: "🚫" });
      return;
    }

    setLat(result.lat);
    setLng(result.lng);
    mapRef.current.flyTo([result.lat, result.lng], 15, { duration: 1.2 });
    markerRef.current.setLatLng([result.lat, result.lng]);
    onLocationChange(result.lat, result.lng);
    toast.success(`Position centrée sur ${result.name}`, { icon: "📍", duration: 2500 });
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLocating(false);

        // Détection de géolocalisation IP FAI imprécise (ex: Abidjan/Cocody au lieu de Dabou)
        if (accuracy && accuracy > 3000) {
          toast(
            `Position réseau approximative (~${Math.round(accuracy / 1000)} km). Vous pouvez affiner avec la recherche ou en déplaçant le repère.`,
            { icon: "📡", duration: 5000 }
          );
        }

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

  const isPendingInDaloa = pendingCoords ? isLocationInDaloa(pendingCoords.lat, pendingCoords.lng) : true;
  const distanceFromCenter = pendingCoords ? getDistanceFromDaloaCenterKm(pendingCoords.lat, pendingCoords.lng) : 0;
  const isBlocked = userType === 'seller' && !isPendingInDaloa && !isSuperOrAdmin;

  return (
    <div className="space-y-2.5 relative">
      {/* Barre de recherche d'adresse / quartier avec autocomplétion Côte d'Ivoire */}
      {!readOnly && (
        <LocationSearchInput
          onSelectLocation={handleSearchResult}
          placeholder="Rechercher une ville, commune, quartier (ex: Dabou, Tazibouo...)"
        />
      )}

      <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-lg shadow-gray-200/50">
        {/* Bouton de bascule Mode Satellite / Plan en haut à droite */}
        <button
          type="button"
          onClick={toggleMapMode}
          className="absolute right-3 top-3 z-[1000] pointer-events-auto flex items-center gap-1.5 rounded-2xl bg-white/95 px-3 py-1.5 text-[11px] font-extrabold text-gray-800 shadow-md backdrop-blur border border-gray-100 hover:bg-white active:scale-95 transition-all"
          title="Changer de vue cartographique"
        >
          <Layers className="w-3.5 h-3.5 text-orange-500" />
          <span>{mapMode === 'street' ? '🛰️ Satellite' : '🗺️ Plan HD'}</span>
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
            className="absolute bottom-3 right-3 z-[1000] pointer-events-auto flex min-h-10 items-center gap-2 rounded-2xl border border-gray-100 bg-white/95 px-3.5 py-2 text-xs font-extrabold text-gray-900 shadow-lg backdrop-blur-md transition-all hover:bg-white active:scale-95 disabled:opacity-50"
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
        <span className="text-[11px] text-gray-400 text-right">{placeholder}</span>
      </div>

      {/* Modale de confirmation de position GPS + Geofencing */}
      <LocationConfirmModal
        isOpen={showConfirmModal}
        pendingCoords={pendingCoords}
        userType={userType}
        isBlocked={isBlocked}
        isSuperOrAdmin={isSuperOrAdmin}
        distanceFromCenter={distanceFromCenter}
        isPendingInDaloa={isPendingInDaloa}
        onConfirm={handleConfirmLocation}
        onCancel={handleCancelLocation}
      />
    </div>
  );
};

export { LocationPicker };
export default LocationPicker;
