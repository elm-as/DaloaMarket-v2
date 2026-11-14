import React from 'react';
import { Phone } from 'lucide-react';
import { AdminScrollTableContainer } from '../ui/AdminUI';

export interface AmbassadorRow {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  referral_code: string;
  balance_available: number;
  total_earnings: number;
  payout_network: string;
  payout_number: string;
  created_at: string;
  ambassador_referrals?: { count: number }[];
}

export function getAmbassadorSellerCount(ambassador: AmbassadorRow): number {
  return ambassador.ambassador_referrals?.[0]?.count || 0;
}

interface AdminAmbassadorListProps {
  ambassadors: AmbassadorRow[];
}

export const AdminAmbassadorList: React.FC<AdminAmbassadorListProps> = ({ ambassadors }) => {
  if (ambassadors.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-gray-400">
        Aucun ambassadeur trouvé.
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-3 md:hidden" aria-label="Annuaire des ambassadeurs">
        {ambassadors.map((amb) => (
          <li
            key={amb.id}
            className="rounded-xl border border-gray-200/80 bg-stone-50/50 p-3.5 space-y-2.5 text-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-gray-900 truncate">{amb.full_name}</p>
                <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 tabular-nums">
                  <Phone className="w-3 h-3 shrink-0" />
                  <span>{amb.phone}</span>
                </p>
              </div>
              <span className="shrink-0 font-mono font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md text-xs">
                {amb.referral_code}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 border-y border-gray-200/70 py-2">
              <div>
                <p className="text-[10px] text-gray-500">Vendeurs</p>
                <p className="font-bold text-gray-900 tabular-nums">
                  {getAmbassadorSellerCount(amb)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Solde</p>
                <p className="font-bold text-emerald-700 tabular-nums">
                  {(Number(amb.balance_available) || 0).toLocaleString('fr-FR')} F
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Total gagné</p>
                <p className="font-semibold text-gray-800 tabular-nums">
                  {(Number(amb.total_earnings) || 0).toLocaleString('fr-FR')} F
                </p>
              </div>
            </div>

            <div className="text-[11px] text-gray-600 tabular-nums">
              Paiement : <strong className="text-gray-800">{amb.payout_network}</strong> · {amb.payout_number}
            </div>
          </li>
        ))}
      </ul>

      <AdminScrollTableContainer label="Annuaire des ambassadeurs" className="hidden md:block">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400">
              <th className="py-3 px-3">Ambassadeur</th>
              <th className="py-3 px-3">Code Parrain</th>
              <th className="py-3 px-3 text-center">Vendeurs</th>
              <th className="py-3 px-3 text-right">Solde Actuel</th>
              <th className="py-3 px-3 text-right">Total Gagné</th>
              <th className="py-3 px-3">Paiement par défaut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-xs">
            {ambassadors.map((amb) => (
              <tr key={amb.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="py-3 px-3">
                  <p className="font-bold text-gray-900">{amb.full_name}</p>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 tabular-nums">
                    <Phone className="w-3 h-3" /> {amb.phone}
                  </p>
                </td>
                <td className="py-3 px-3">
                  <span className="font-mono font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md text-xs">
                    {amb.referral_code}
                  </span>
                </td>
                <td className="py-3 px-3 text-center font-bold text-gray-800 tabular-nums">
                  {getAmbassadorSellerCount(amb)}
                </td>
                <td className="py-3 px-3 text-right font-bold text-emerald-600 tabular-nums whitespace-nowrap">
                  {(Number(amb.balance_available) || 0).toLocaleString('fr-FR')} F
                </td>
                <td className="py-3 px-3 text-right font-medium text-gray-700 tabular-nums whitespace-nowrap">
                  {(Number(amb.total_earnings) || 0).toLocaleString('fr-FR')} F
                </td>
                <td className="py-3 px-3">
                  <span className="text-[11px] text-gray-600 tabular-nums">
                    <strong>{amb.payout_network}</strong> : {amb.payout_number}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminScrollTableContainer>
    </>
  );
};
