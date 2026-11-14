import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';
import { cn, formatPrice } from '../../lib/utils';
import type { LatLng } from '../../lib/pricing';
import { DALOA_DISTRICT_COORDINATES } from '../../lib/daloaGeo';
import { LocationPicker } from '../ui/LocationPicker';
import { Button } from '../ui/Button';
import { OUT_OF_ZONE_MESSAGE } from './checkout.types';

interface CheckoutStepAddressProps {
  addressState: {
    deliveryAddress: string;
    deliveryDistrict: string;
    addressError: boolean;
    deliveryLatitude: number;
    deliveryLongitude: number;
  };
  routeState: {
    isPickup: boolean;
    isOutOfZone: boolean;
    isCartMode: boolean;
    sellerCoords: LatLng | null;
    distanceKm: number;
    routing: boolean;
    deliveryFee: number;
    sellerFeeCount: number;
  };
  actions: {
    onLocationChange: (lat: number, lng: number) => void;
    onDistrictChange: (district: string, coords?: { latitude: number; longitude: number }) => void;
    onAddressChange: (address: string) => void;
    onBack: () => void;
    onNext: () => void;
  };
}

export const CheckoutStepAddress: React.FC<CheckoutStepAddressProps> = ({
  addressState,
  routeState,
  actions,
}) => {
  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-4"
    >
      <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-[var(--color-primary)]">
            <MapPin size={16} />
          </div>
          <span>Adresse & Repère de livraison à Daloa</span>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-stone-200">
          <LocationPicker
            initialLat={addressState.deliveryLatitude}
            initialLng={addressState.deliveryLongitude}
            userType="buyer"
            onLocationChange={actions.onLocationChange}
            placeholder="Cliquez sur la carte pour affiner la position"
            className="h-56 w-full bg-stone-100"
            sellerCoords={routeState.isCartMode ? null : routeState.sellerCoords}
          />
        </div>

        {!routeState.isPickup && routeState.isOutOfZone && (
          <div
            className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700"
            role="alert"
          >
            <MapPin size={14} />
            <span>{OUT_OF_ZONE_MESSAGE}</span>
          </div>
        )}

        {!routeState.isPickup && !routeState.isOutOfZone && routeState.distanceKm > 0 && (
          <div
            className="flex items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs font-semibold text-orange-800"
            aria-live="polite"
          >
            <Navigation size={14} className={routeState.routing ? 'animate-pulse' : undefined} />
            {routeState.routing ? (
              <span>Calcul de l'itinéraire…</span>
            ) : (
              <>
                <span className="tabular-nums">Distance : {routeState.distanceKm} km</span>
                <span className="text-orange-300">·</span>
                <span className="tabular-nums">
                  Frais : {formatPrice(routeState.deliveryFee)}
                  {routeState.sellerFeeCount > 1 && ` (${routeState.sellerFeeCount} vendeurs)`}
                </span>
              </>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-stone-700">
            Quartier à Daloa <span className="text-red-500">*</span>
          </label>
          <select
            value={addressState.deliveryDistrict}
            onChange={(e) => {
              const selected = e.target.value;
              actions.onDistrictChange(selected, DALOA_DISTRICT_COORDINATES[selected]);
            }}
            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm font-semibold text-stone-900 focus:border-[var(--color-primary)] focus:bg-white focus:outline-none"
          >
            {Object.keys(DALOA_DISTRICT_COORDINATES).map((districtName) => (
              <option key={districtName} value={districtName}>
                {districtName}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-stone-500">
            Si votre GPS est indisponible, la sélection du quartier suffit pour calculer la livraison.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-stone-700">
            Précisions d'adresse & Quartier <span className="text-red-500">*</span>
          </label>
          <textarea
            value={addressState.deliveryAddress}
            onChange={(e) => actions.onAddressChange(e.target.value)}
            placeholder="Exemple : Quartier Tazibouo, près de la pharmacie, maison portail bleu..."
            rows={3}
            className={cn(
              'w-full resize-none rounded-lg border p-3 text-sm font-medium placeholder:text-stone-400 focus:outline-none',
              addressState.addressError
                ? 'border-red-400 bg-red-50/30'
                : 'border-stone-200 bg-stone-50 focus:border-[var(--color-primary)] focus:bg-white'
            )}
          />
          {addressState.addressError && (
            <p className="mt-1 text-xs font-semibold text-red-600">
              Veuillez spécifier votre quartier ou repère.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button variant="outlined" color="secondary" size="md" onClick={actions.onBack} className="shrink-0 rounded-xl px-5 font-semibold">
          ← Retour
        </Button>
        <Button variant="filled" color="primary" size="md" onClick={actions.onNext} className="flex-1 whitespace-nowrap rounded-xl font-bold">
          Continuer vers le paiement →
        </Button>
      </div>
    </motion.div>
  );
};
