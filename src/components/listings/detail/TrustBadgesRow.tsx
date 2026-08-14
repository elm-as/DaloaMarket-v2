import React from 'react';
import { ShieldCheck, Truck } from 'lucide-react';

const TrustBadgesRow: React.FC = () => (
  <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-lg shadow-gray-200/40 flex items-center justify-around gap-2 text-center">
    <div className="flex flex-col items-center">
      <ShieldCheck className="w-6 h-6 text-[#FF7F00] mb-1" />
      <span className="text-[11px] font-extrabold text-gray-900">Paiement Sécurisé</span>
      <span className="text-[10px] text-gray-500">Protection Escrow</span>
    </div>
    <div className="h-8 w-px bg-orange-200/50" />
    <div className="flex flex-col items-center">
      <Truck className="w-6 h-6 text-[#FF7F00] mb-1" />
      <span className="text-[11px] font-extrabold text-gray-900">Livraison Daloa</span>
      <span className="text-[10px] text-gray-500">Par DaloaDelivery</span>
    </div>
  </div>
);

export default TrustBadgesRow;
