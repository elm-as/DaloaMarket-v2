import React, { useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { getPaymentNetworks, type PaymentNetworkInfo } from '../../lib/payment';

interface PaymentNetworkStatusProps {
  className?: string;
  compact?: boolean;
}

export const PaymentNetworkStatus: React.FC<PaymentNetworkStatusProps> = ({
  className = '',
  compact = false,
}) => {
  const [networks, setNetworks] = useState<PaymentNetworkInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getPaymentNetworks()
      .then((data) => {
        if (mounted) {
          setNetworks(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading || networks.length === 0) {
    return null; // Discret si indisponible ou en cours de chargement
  }

  const inactive = networks.filter((n) => !n.isActive);
  const active = networks.filter((n) => n.isActive);

  // Cas 1 : Alerte panne / maintenance sur un ou plusieurs réseaux
  if (inactive.length > 0) {
    const inactiveNames = inactive.map((n) => n.name).join(', ');
    const activeNames = active.map((n) => n.name).join(', ');

    return (
      <div
        className={`flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950 ${className}`}
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="leading-relaxed">
          <p className="font-bold">
            Maintenance opérateur en cours : {inactiveNames}
          </p>
          <p className="mt-0.5 text-[11px] text-amber-800">
            {activeNames ? (
              <>Nous vous conseillons d'utiliser <strong>{activeNames}</strong> pour un règlement instantané.</>
            ) : (
              'Les paiements Mobile Money peuvent connaître des lenteurs temporaires.'
            )}
          </p>
        </div>
      </div>
    );
  }

  // Cas 2 : Mode compact (badge vert discret)
  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200/60 ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>Réseaux Mobile Money opérationnels (Wave, Orange, MTN, Moov, Djamo)</span>
      </div>
    );
  }

  // Cas 3 : Mode complet élégant
  return (
    <div
      className={`rounded-2xl border border-gray-100 bg-gray-50/70 p-3 text-xs ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-gray-800">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Réseaux Mobile Money en direct</span>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-emerald-100/70 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Opérationnels</span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {networks.map((n) => (
          <span
            key={n.code}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] font-medium text-gray-700 border border-gray-100 shadow-2xs"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {n.name}
          </span>
        ))}
      </div>
    </div>
  );
};
