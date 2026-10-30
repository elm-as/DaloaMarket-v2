import React, { useState, useEffect } from 'react';
import { Radio, Navigation, Clock, MapPin, Phone, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { haversineDistance } from '../../lib/delivery';
import { cn } from '../../lib/utils';

interface WebDeliveryRadarCardProps {
  assignmentId: string;
  driverName: string;
  driverPhone?: string | null;
  deliveryAddress?: string | null;
  destLat?: number | null;
  destLng?: number | null;
}

type FreshnessState = 'live' | 'stale' | 'disconnected';

const FRESHNESS_BADGE: Record<FreshnessState, { label: string; dot: string; badge: string }> = {
  live: {
    label: 'Signal GPS direct',
    dot: 'bg-emerald-500 animate-ping',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  stale: {
    label: 'Signal récent',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  disconnected: {
    label: 'En attente du signal GPS',
    dot: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-600 border-gray-200',
  },
};

function computeFreshness(lastUpdateMs: number): FreshnessState {
  if (!lastUpdateMs) return 'disconnected';
  const elapsedSec = (Date.now() - lastUpdateMs) / 1000;
  if (elapsedSec <= 45) return 'live';
  if (elapsedSec <= 180) return 'stale';
  return 'disconnected';
}

export const WebDeliveryRadarCard: React.FC<WebDeliveryRadarCardProps> = ({
  assignmentId,
  driverName,
  driverPhone,
  deliveryAddress,
  destLat,
  destLng,
}) => {
  const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [lastUpdateMs, setLastUpdateMs] = useState<number>(0);
  const [freshness, setFreshness] = useState<FreshnessState>('disconnected');

  useEffect(() => {
    setFreshness(computeFreshness(lastUpdateMs));
    const timer = setInterval(() => {
      setFreshness(computeFreshness(lastUpdateMs));
    }, 5000);
    return () => clearInterval(timer);
  }, [lastUpdateMs]);

  useEffect(() => {
    if (!assignmentId) return;
    let active = true;

    const loadInitial = async () => {
      try {
        const { data } = await (supabase.from('driver_live_locations' as any) as any)
          .select('lat, lng, updated_at')
          .eq('assignment_id', assignmentId)
          .maybeSingle();

        if (!active || !data) return;
        const lat = Number(data.lat);
        const lng = Number(data.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setDriverCoords({ lat, lng });
          setLastUpdateMs(data.updated_at ? new Date(data.updated_at).getTime() : Date.now());
        }
      } catch {
        // Ignorer si pas encore de point GPS
      }
    };

    loadInitial();

    const channel = supabase
      .channel(`run-tracking:${assignmentId}`)
      .on('broadcast', { event: 'location' }, (msg) => {
        const payload = msg?.payload as Record<string, unknown> | undefined;
        const lat = Number(payload?.lat);
        const lng = Number(payload?.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setDriverCoords({ lat, lng });
          setLastUpdateMs(Number(payload?.timestamp) || Date.now());
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_live_locations',
          filter: `assignment_id=eq.${assignmentId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown> | undefined;
          const lat = Number(row?.lat);
          const lng = Number(row?.lng);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            setDriverCoords({ lat, lng });
            setLastUpdateMs(row?.updated_at ? new Date(String(row.updated_at)).getTime() : Date.now());
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [assignmentId]);

  const targetLat = destLat ?? 6.8774;
  const targetLng = destLng ?? -6.4502;
  const distanceKm = driverCoords
    ? Math.max(
        0.2,
        Math.round(
          haversineDistance(
            { latitude: driverCoords.lat, longitude: driverCoords.lng },
            { latitude: targetLat, longitude: targetLng }
          ) *
            1.25 *
            10
        ) / 10
      )
    : null;
  const etaMinutes = distanceKm != null ? Math.max(2, Math.round((distanceKm / 25) * 60)) : null;

  const badge = FRESHNESS_BADGE[freshness];
  const mapUrl = driverCoords
    ? `https://www.google.com/maps/search/?api=1&query=${driverCoords.lat},${driverCoords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((deliveryAddress || 'Daloa') + ', Daloa')}`;

  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <Radio className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wide">Radar Coursier en Direct</h3>
            <p className="text-[11px] text-gray-500 font-medium">{driverName}</p>
          </div>
        </div>

        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold', badge.badge)}>
          <span className="relative flex h-2 w-2">
            <span className={cn('h-2 w-2 rounded-full', badge.dot)} />
          </span>
          {badge.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
            <Navigation className="h-3.5 w-3.5 text-orange-500" />
            <span>Distance restante</span>
          </div>
          <p className="mt-1 text-base font-black text-gray-900 tabular-nums">
            {distanceKm != null ? `${distanceKm} km` : 'En route'}
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
            <Clock className="h-3.5 w-3.5 text-orange-500" />
            <span>Arrivée estimée</span>
          </div>
          <p className="mt-1 text-base font-black text-orange-600 tabular-nums">
            {etaMinutes != null ? `~${etaMinutes} min` : 'Calcul...'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 h-10 items-center justify-center gap-1.5 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 text-xs font-extrabold transition-colors"
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>{driverCoords ? 'Voir la position GPS sur la carte' : 'Voir sur Google Maps'}</span>
          <ExternalLink className="h-3 w-3" />
        </a>
        {driverPhone && (
          <a
            href={`tel:${driverPhone}`}
            className="flex h-10 px-3.5 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-extrabold transition-colors"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>Appeler</span>
          </a>
        )}
      </div>
    </div>
  );
};
