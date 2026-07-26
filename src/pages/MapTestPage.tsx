import { useState } from 'react';
import DaloaMap from '../components/maps/DaloaMap';

const TEST_SPOTS: { label: string; lat: number; lng: number }[] = [
  { label: 'Lobia', lat: 6.8850, lng: -6.4600 },
  { label: 'Centre-ville', lat: 6.8773, lng: -6.4502 },
  { label: 'Orly', lat: 6.8700, lng: -6.4400 },
  { label: 'Gbèkè', lat: 6.8830, lng: -6.4350 },
];

export default function MapTestPage() {
  const [sellerIdx, setSellerIdx] = useState(0);
  const [buyerIdx, setBuyerIdx] = useState(2);
  const [courierIdx, setCourierIdx] = useState<number | null>(null);

  const seller = TEST_SPOTS[sellerIdx];
  const buyer = TEST_SPOTS[buyerIdx];
  const courier = courierIdx != null ? TEST_SPOTS[courierIdx] : null;

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="px-4 py-3 flex items-center gap-3">
        <h1 className="text-[18px] font-bold text-[var(--color-on-surface)]">
          Test Carte DaloaMarket
        </h1>
      </div>

      <div className="px-4 space-y-4 pb-8">
        <DaloaMap
          sellerPosition={[seller.lat, seller.lng]}
          buyerPosition={[buyer.lat, buyer.lng]}
          deliveryPersonPosition={courier ? [courier.lat, courier.lng] : undefined}
          height="350px"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-[var(--color-on-surface-variant)]">Vendeur</label>
            <select
              value={sellerIdx}
              onChange={(e) => setSellerIdx(Number(e.target.value))}
              className="w-full mt-1 h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm"
            >
              {TEST_SPOTS.map((s, i) => (
                <option key={i} value={i}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--color-on-surface-variant)]">Acheteur</label>
            <select
              value={buyerIdx}
              onChange={(e) => setBuyerIdx(Number(e.target.value))}
              className="w-full mt-1 h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm"
            >
              {TEST_SPOTS.map((s, i) => (
                <option key={i} value={i}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--color-on-surface-variant)]">Livreur</label>
          <select
            value={courierIdx ?? ''}
            onChange={(e) => setCourierIdx(e.target.value ? Number(e.target.value) : null)}
            className="w-full mt-1 h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm"
          >
            <option value="">Aucun livreur</option>
            {TEST_SPOTS.map((s, i) => (
              <option key={i} value={i}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[12px] text-blue-700">
          Sélectionne un quartier vendeur et acheteur pour voir le trajet calculé par OSRM en temps réel.
          Ajoute un livreur pour voir le marqueur mobile vert.
        </div>
      </div>
    </div>
  );
}
