import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Award, 
  Users, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Phone, 
  RefreshCw,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AmbassadorRow {
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

interface PayoutRow {
  id: string;
  ambassador_id: string;
  amount: number;
  network: 'wave' | 'orange' | 'mtn';
  phone_number: string;
  status: 'requested' | 'processing' | 'completed' | 'rejected';
  requested_at: string;
  processed_at?: string | null;
  ambassador?: {
    full_name: string;
    phone: string;
    referral_code: string;
  };
}

export const AdminAmbassadorsTab: React.FC = () => {
  const [ambassadors, setAmbassadors] = useState<AmbassadorRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Ambassadors with referrals count
      const { data: ambData, error: ambError } = await (supabase as any)
        .from('ambassadors')
        .select('*, ambassador_referrals(count)')
        .order('created_at', { ascending: false });

      if (ambError) throw ambError;
      setAmbassadors(ambData || []);

      // 2. Fetch Payouts with ambassador info
      const { data: payData, error: payError } = await (supabase as any)
        .from('ambassador_payouts')
        .select(`
          id,
          ambassador_id,
          amount,
          network,
          phone_number,
          status,
          requested_at,
          processed_at,
          ambassadors(full_name, phone, referral_code)
        `)
        .order('requested_at', { ascending: false });

      if (payError) throw payError;
      
      const formattedPayouts: PayoutRow[] = (payData || []).map((p: any) => ({
        id: p.id,
        ambassador_id: p.ambassador_id,
        amount: Number(p.amount) || 0,
        network: p.network,
        phone_number: p.phone_number,
        status: p.status,
        requested_at: p.requested_at,
        processed_at: p.processed_at,
        ambassador: Array.isArray(p.ambassadors) ? p.ambassadors[0] : p.ambassadors
      }));

      setPayouts(formattedPayouts);
    } catch (err: any) {
      console.error('Erreur chargement ambassadeurs:', err);
      toast.error('Impossible de charger les données ambassadeurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdatePayoutStatus = async (payoutId: string, status: 'completed' | 'rejected') => {
    try {
      setProcessingId(payoutId);
      const updatePayload: any = {
        status,
        processed_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('ambassador_payouts' as any)
        .update(updatePayload)
        .eq('id', payoutId);

      if (error) throw error;

      toast.success(status === 'completed' ? 'Retrait validé comme Payé !' : 'Retrait rejeté.');
      await fetchData();
    } catch (err: any) {
      console.error('Erreur mise à jour retrait:', err);
      toast.error(err.message || 'Échec de la validation');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingPayouts = payouts.filter((p) => p.status === 'requested');
  const totalPaidOut = payouts
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const getSellerCount = (amb: AmbassadorRow) => {
    if (amb.ambassador_referrals && amb.ambassador_referrals[0]) {
      return amb.ambassador_referrals[0].count || 0;
    }
    return 0;
  };

  const totalReferredSellers = ambassadors.reduce((sum, a) => sum + getSellerCount(a), 0);

  const filteredAmbassadors = ambassadors.filter((a) => 
    a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.referral_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-orange-600 mb-1">
            <Award className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Ambassadeurs</span>
          </div>
          <p className="text-2xl font-black text-gray-900 tabular-nums">{ambassadors.length}</p>
          <p className="text-[11px] text-gray-500">Inscrits sur le réseau</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Vendeurs Enrôlés</span>
          </div>
          <p className="text-2xl font-black text-gray-900 tabular-nums">{totalReferredSellers}</p>
          <p className="text-[11px] text-gray-500">Boutiques rattachées</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Retraits en attente</span>
          </div>
          <p className="text-2xl font-black text-gray-900 tabular-nums">{pendingPayouts.length}</p>
          <p className="text-[11px] text-gray-500">À traiter via Wave / OM</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Total Payé</span>
          </div>
          <p className="text-2xl font-black text-gray-900 tabular-nums">
            {totalPaidOut.toLocaleString('fr-FR')} F
          </p>
          <p className="text-[11px] text-gray-500">Commissions versées</p>
        </div>
      </div>

      {/* Pending Payout Requests Section */}
      {pendingPayouts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-amber-900 text-sm">
                Demandes de Retrait à Traiter ({pendingPayouts.length})
              </h3>
            </div>
            <span className="text-xs font-semibold text-amber-700 bg-amber-200/60 px-2.5 py-1 rounded-full">
              Paiement direct Wave / OM
            </span>
          </div>

          <div className="space-y-3">
            {pendingPayouts.map((payout) => (
              <div 
                key={payout.id}
                className="bg-white rounded-xl p-4 border border-amber-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">
                      {payout.ambassador?.full_name || 'Ambassadeur'}
                    </span>
                    <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {payout.ambassador?.referral_code}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-3">
                    <span className="font-medium text-emerald-700 uppercase">
                      Réseau : {payout.network}
                    </span>
                    <span>Numéro : <strong className="tabular-nums">{payout.phone_number}</strong></span>
                    <span className="text-gray-400">
                      {new Date(payout.requested_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3">
                  <span className="text-base font-black text-gray-900 tabular-nums">
                    {payout.amount.toLocaleString('fr-FR')} FCFA
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdatePayoutStatus(payout.id, 'completed')}
                      disabled={processingId === payout.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Marquer Payé
                    </button>
                    <button
                      onClick={() => handleUpdatePayoutStatus(payout.id, 'rejected')}
                      disabled={processingId === payout.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" /> Rejeter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ambassador Directory */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Annuaire des Ambassadeurs</h3>
            <p className="text-xs text-gray-500">Liste des partenaires terrain actifs à Daloa</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher nom, code, tél..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-900 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase">
                <th className="py-3 px-3">Ambassadeur</th>
                <th className="py-3 px-3">Code Parrain</th>
                <th className="py-3 px-3 text-center">Vendeurs</th>
                <th className="py-3 px-3 text-right">Solde Actuel</th>
                <th className="py-3 px-3 text-right">Total Gagné</th>
                <th className="py-3 px-3">Paiement par défaut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {filteredAmbassadors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Aucun ambassadeur trouvé.
                  </td>
                </tr>
              ) : (
                filteredAmbassadors.map((amb) => (
                  <tr key={amb.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-bold text-gray-900">{amb.full_name}</p>
                      <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {amb.phone}
                      </p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md text-xs">
                        {amb.referral_code}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-gray-800 tabular-nums">
                      {getSellerCount(amb)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600 tabular-nums">
                      {(Number(amb.balance_available) || 0).toLocaleString('fr-FR')} F
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-gray-700 tabular-nums">
                      {(Number(amb.total_earnings) || 0).toLocaleString('fr-FR')} F
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] text-gray-600">
                        <strong className="uppercase">{amb.payout_network}</strong> : {amb.payout_number}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
