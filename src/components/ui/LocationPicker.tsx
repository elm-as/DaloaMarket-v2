import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation } from "lucide-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationChange: (lat: number, lng: number) => void;
  placeholder?: string;
  readOnly?: boolean;
  zoom?: number;
  className?: string;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  initialLat,
  initialLng,
  onLocationChange,
  placeholder = "Cliquez sur la carte pour définir la position",
  readOnly = false,
  zoom = 14,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [lat, setLat] = useState(initialLat ?? 6.8774);
  const [lng, setLng] = useState(initialLng ?? -6.4502);
  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);

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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([lat, lng], { draggable: !readOnly }).addTo(map);

    if (!readOnly) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat: newLat, lng: newLng } = e.latlng;
        marker.setLatLng([newLat, newLng]);
        setLat(newLat);
        setLng(newLng);
        onLocationChange(newLat, newLng);
      });

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
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
    };
  }, []);

  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.setView([latitude, longitude], zoom);
        markerRef.current?.setLatLng([latitude, longitude]);
        setLat(latitude);
        setLng(longitude);
        onLocationChange(latitude, longitude);
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-lg shadow-gray-200/50">
        <div className="absolute left-3 top-3 z-[400] flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-extrabold text-gray-800 shadow-sm backdrop-blur pointer-events-none">
          <MapPin className="h-3.5 w-3.5 text-orange-500" />
          Votre point de livraison
        </div>
        <div
          ref={containerRef}
          className={className || "w-full h-56 bg-gray-100"}
          style={{ zIndex: 0 }}
        />
        {!readOnly && (
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating}
            className="absolute bottom-3 right-3 z-[400] flex min-h-10 items-center gap-2 rounded-2xl border border-gray-100 bg-white/95 px-3.5 py-2 text-xs font-extrabold text-gray-900 shadow-lg backdrop-blur-md transition-all hover:bg-white active:scale-95 disabled:opacity-50"
          >
            <Navigation className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
            {locating ? "Localisation en cours..." : "Ma position GPS"}
          </button>
        )}
      </div>
      <div className="flex items-start justify-between gap-3 px-1 text-[11px] font-medium text-gray-500">
        <span className="flex shrink-0 items-center gap-1 font-bold text-gray-700">
          <MapPin className="h-3.5 w-3.5 text-orange-500" />
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </span>
        <span className="text-[11px] text-gray-400">{placeholder}</span>
      </div>
    </div>
  );
};

export { LocationPicker };
export default LocationPicker;
