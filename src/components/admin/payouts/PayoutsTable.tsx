import React, { useState } from 'react';
import { Search, RefreshCw, AlertCircle, Phone, ArrowUpRight, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn, formatPrice, formatDate } from '../../../lib/utils';
import type { PayoutItem, PayoutStatus, PayoutType } from './types';
import { supabase } from '../../../lib/supabase';

interface PayoutsTableProps {
  payouts: PayoutItem[];
  onRefresh: () => void;
}

export const PayoutsTable: React.FC<PayoutsTableProps> = ({ payouts, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PayoutStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | PayoutType>('all');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié`);
  };

  const handleRetrySinglePayout = async (payoutId: string) => {
    setRetryingId(payoutId);
    try {
      const apiUrl = import.meta.env.VITE_PAYMENT_API_URL || 'https://api.daloamarket.com';
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) throw new Error('Session expirée');

      const res = await fetch(`${apiUrl}/retry-payout/${payoutId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Versement remis en attente. Déclenchement de la synchro...');
        // Déclencher le traitement immédiat
        await fetch(`${apiUrl}/process-payouts?force=true`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        onRefresh();
      } else {
        toast.error(data.message || 'Impossible de réinitialiser le versement');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la tentative de versement');
    } finally {
      setRetryingId(null);
    }
  };

  const filteredPayouts = payouts.filter((item) => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'paid') {
        if (item.status !== 'paid' && item.status !== 'completed') return false;
      } else if (item.status !== statusFilter) {
        return false;
      }
    }

    if (typeFilter !== 'all' && item.type !== typeFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const phone = item.recipient_phone?.toLowerCase() || '';
      const name = item.user?.full_name?.toLowerCase() || '';
      const token = item.provider_token?.toLowerCase() || '';
      const id = item.id.toLowerCase();
      return phone.includes(q) || name.includes(q) || token.includes(q) || id.includes(q);
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par téléphone, nom, token MoneyFusion ou ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['all', 'pending', 'processing', 'paid', 'failed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {st === 'all'
                ? 'Tous'
                : st === 'pending'
                ? 'En attente'
                : st === 'processing'
                ? 'En cours'
                : st === 'paid'
                ? 'Payés'
                : 'Échoués'}
            </button>
          ))}
        </div>

        {/* Type filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['all', 'seller', 'delivery', 'refund'] as const).map((tp) => (
            <button
              key={tp}
              onClick={() => setTypeFilter(tp)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                typeFilter === tp
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {tp === 'all' ? 'Tous flux' : tp === 'seller' ? 'Vendeurs' : tp === 'delivery' ? 'Livreurs' : 'Remboursements'}
            </button>
          ))}
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {filteredPayouts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Aucun versement ne correspond aux critères sélectionnés.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date / Réf</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Bénéficiaire</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Montant</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4">Détails / Erreur</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayouts.map((p) => {
                  const isPaid = p.status === 'paid' || p.status === 'completed';
                  const isFailed = p.status === 'failed';
                  const isProcessing = p.status === 'processing';
                  const isRetrying = retryingId === p.id;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Date & ID */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{formatDate(p.created_at)}</div>
                        <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                          <span>#{p.id.slice(0, 8)}</span>
                          <button
                            onClick={() => handleCopy(p.id, 'ID')}
                            className="hover:text-slate-700"
                            title="Copier ID"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                            p.type === 'seller'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : p.type === 'delivery'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          )}
                        >
                          {p.type === 'seller' ? 'Vendeur' : p.type === 'delivery' ? 'Livreur' : 'Remboursement'}
                        </span>
                      </td>

                      {/* Recipient */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{p.user?.full_name || 'Destinataire'}</div>
                        <div className="flex items-center gap-1 font-mono text-slate-500 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{p.recipient_phone}</span>
                        </div>
                      </td>

                      {/* Withdraw Mode */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700 capitalize">
                          {p.withdraw_mode?.replace('-ci', '').replace('_', ' ') || 'Mobile Money'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono tabular-nums font-semibold text-slate-950 text-sm">
                          {formatPrice(p.amount)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold',
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isProcessing
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : isFailed
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          )}
                        >
                          {isPaid ? 'Payé' : isProcessing ? 'En cours' : isFailed ? 'Échec' : 'En attente'}
                        </span>
                      </td>

                      {/* Details / Error */}
                      <td className="py-3 px-4 max-w-xs">
                        {p.failure_reason ? (
                          <div className="flex items-start gap-1 text-[11px] text-rose-600 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span className="truncate" title={p.failure_reason}>{p.failure_reason}</span>
                          </div>
                        ) : p.provider_token ? (
                          <div className="font-mono text-[10px] text-slate-500 truncate" title={p.provider_token}>
                            Token: {p.provider_token}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {isFailed && (
                          <button
                            onClick={() => handleRetrySinglePayout(p.id)}
                            disabled={isRetrying}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px] transition-all disabled:opacity-50"
                          >
                            <RefreshCw className={cn('w-3 h-3', isRetrying && 'animate-spin')} />
                            {isRetrying ? 'Envoi...' : 'Réessayer'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
