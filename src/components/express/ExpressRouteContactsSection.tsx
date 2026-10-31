import React from 'react';
import { MapPin, User, Phone } from 'lucide-react';

interface ExpressRouteContactsSectionProps {
  districts: string[];
  pickupDistrict: string;
  setPickupDistrict: (v: string) => void;
  pickupAddress: string;
  setPickupAddress: (v: string) => void;
  senderName: string;
  setSenderName: (v: string) => void;
  senderPhone: string;
  setSenderPhone: (v: string) => void;
  dropoffDistrict: string;
  setDropoffDistrict: (v: string) => void;
  dropoffAddress: string;
  setDropoffAddress: (v: string) => void;
  recipientName: string;
  setRecipientName: (v: string) => void;
  recipientPhone: string;
  setRecipientPhone: (v: string) => void;
}

export const ExpressRouteContactsSection: React.FC<ExpressRouteContactsSectionProps> = ({
  districts,
  pickupDistrict,
  setPickupDistrict,
  pickupAddress,
  setPickupAddress,
  senderName,
  setSenderName,
  senderPhone,
  setSenderPhone,
  dropoffDistrict,
  setDropoffDistrict,
  dropoffAddress,
  setDropoffAddress,
  recipientName,
  setRecipientName,
  recipientPhone,
  setRecipientPhone,
}) => {
  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-2 text-sm font-black text-gray-900">
        <MapPin className="h-4 w-4 text-orange-600" />
        <span>2. Trajet & Contacts à Daloa</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-orange-50/40 border border-orange-100 p-3.5 space-y-3">
          <p className="text-xs font-black uppercase text-orange-700">Ramassage (Expéditeur)</p>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Quartier de départ</label>
            <select
              value={pickupDistrict}
              onChange={(e) => setPickupDistrict(e.target.value)}
              className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold"
            >
              {districts.map((d) => (
                <option key={`p-${d}`} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
            placeholder="Repère précis (ex: Pharmacie, carrefour...)"
            className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs"
          />
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Nom expéditeur"
              className="w-full h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <input
              type="tel"
              required
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
              placeholder="Téléphone expéditeur *"
              className="w-full h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-mono tabular-nums"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-50/40 border border-emerald-100 p-3.5 space-y-3">
          <p className="text-xs font-black uppercase text-emerald-700">Livraison (Destinataire)</p>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Quartier d'arrivée</label>
            <select
              value={dropoffDistrict}
              onChange={(e) => setDropoffDistrict(e.target.value)}
              className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold"
            >
              {districts.map((d) => (
                <option key={`d-${d}`} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={dropoffAddress}
            onChange={(e) => setDropoffAddress(e.target.value)}
            placeholder="Repère précis du destinataire"
            className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs"
          />
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Nom destinataire"
              className="w-full h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <input
              type="tel"
              required
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="Téléphone destinataire *"
              className="w-full h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-mono tabular-nums"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

