import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, MapPin, ExternalLink, ShieldCheck, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { cn, formatPrice, formatDate } from '../../../lib/utils';
import type { DisputeDeliveryItem } from './types';

interface DisputeSettlementSectionProps {
  disputes: DisputeDeliveryItem[];
  onDisputeResolved: () => void;
}

export const DisputeSettlementSection: React.FC<DisputeSettlementSectionProps> = ({
  disputes,
  onDisputeResolved,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'disputed' | 'all'>('disputed');
  const [search, setSearch] = useState('');

  const handleResolve = async (
    assignmentId: string,
    action: 'refund_partial' | 'refund_complete' | 'deliver'
  ) => {
    setProcessingId(assignmentId);
    try {
      const { data, error } = await (supabase as any).rpc('resolve_delivery_dispute', {
        p_assignment_id: assignmentId,
        p_action: action,
      });

      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.reason || 'Action non autorisée');
      }

      if (action === 'refund_partial') {
        toast.success('Règlement partiel effectué : Produit remboursé à l\'acheteur, livreur dédommagé.');
      } else if (action === 'refund_complete') {
        toast.success('Remboursement total validé pour l\'acheteur.');
      } else {
        toast.success('Livraison validée de force : Fonds libérés au vendeur et au livreur.');
      }

      // Synchronisation immédiate des payouts
      try {
        const apiUrl = import.meta.env.VITE_PAYMENT_API_URL || 'https://api.daloamarket.com';
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (token) {
          await fetch(`${apiUrl}/process-payouts?force=true`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch (e) {
        console.warn('Sync post-résolution différée:', e);
      }

      onDisputeResolved();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du traitement du litige');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = disputes.filter((item) => {
    if (filterMode === 'disputed' && item.status !== 'disputed') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const buyerName = item.order?.buyer?.full_name?.toLowerCase() || '';
      const sellerName = item.order?.seller?.full_name?.toLowerCase() || '';
      const driverName = item.delivery_person?.name?.toLowerCase() || '';
      const id = item.id.toLowerCase();
      return buyerName.includes(q) || sellerName.includes(q) || driverName.includes(q) || id.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Information Banner on Partial Refund Policy */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-1">
            <h3 className="font-black text-amber-900 uppercase tracking-wide">
              Procédure d'Arbitrage : Client Absent / Retour Colis
            </h3>
            <p className="text-amber-800 leading-relaxed">
              Lorsqu'un livreur s'est déplacé mais que l'acheteur est absent ou injoignable : appliquez le{' '}
              <strong>Remboursement partiel</strong>. Le livreur reçoit immédiatement sa rémunération de course,
              l'acheteur est remboursé de la marchandise et le colis doit être restitué au vendeur.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterMode('disputed')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
              filterMode === 'disputed'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            Litiges Ouverts ({disputes.filter((d) => d.status === 'disputed').length})
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
              filterMode === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            Toutes les courses récentes ({disputes.length})
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par acteur ou ID..."
          className="w-full sm:w-64 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/20"
        />
      </div>

      {/* Courses List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm bg-white rounded-2xl border border-slate-200">
          Aucun litige ou incident en attente d'arbitrage.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const isProcessing = processingId === item.id;
            const isDisputed = item.status === 'disputed';
            const productAmount = item.order?.product_amount || 0;
            const deliveryFee = item.order?.delivery_fee || 0;
            const driverPay = Math.max(0, deliveryFee - Math.ceil(deliveryFee * 0.10));

            return (
              <div
                key={item.id}
                className={cn(
                  'bg-white border rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden transition-all',
                  isDisputed ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Course #{item.id.slice(0, 8)}
                    </span>
                    <div className="text-xs text-slate-500">{formatDate(item.created_at)}</div>
                  </div>
                  <span
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider',
                      isDisputed
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : item.status === 'delivered'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-700'
                    )}
                  >
                    {isDisputed ? 'LITIGE' : item.status}
                  </span>
                </div>

                {/* Amounts Breakdown */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center border border-slate-100">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Article</span>
                    <p className="font-mono tabular-nums font-bold text-slate-900 text-xs mt-0.5">
                      {formatPrice(productAmount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Frais Course</span>
                    <p className="font-mono tabular-nums font-bold text-slate-900 text-xs mt-0.5">
                      {formatPrice(deliveryFee)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] text-emerald-600 font-bold uppercase">Net Livreur</span>
                    <p className="font-mono tabular-nums font-black text-emerald-700 text-xs mt-0.5">
                      {formatPrice(driverPay)}
                    </p>
                  </div>
                </div>

                {/* Stakeholders info */}
                <div className="bg-slate-50/70 p-3 rounded-xl space-y-1.5 text-xs text-slate-700 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Acheteur :</span>
                    <span className="font-bold">{item.order?.buyer?.full_name || 'Inconnu'} ({item.order?.buyer?.phone || 'N/A'})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Vendeur :</span>
                    <span className="font-bold">{item.order?.seller?.full_name || 'Inconnu'} ({item.order?.seller?.phone || 'N/A'})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Livreur :</span>
                    <span className="font-bold text-amber-800">{item.delivery_person?.name || 'Non assigné'} ({item.delivery_person?.phone || 'N/A'})</span>
                  </div>
                </div>

                {/* Dispute Reason */}
                {item.dispute_reason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[10px] uppercase tracking-wider text-red-600">Motif signalé</p>
                      <p className="font-medium mt-0.5">{item.dispute_reason}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Décision d'Arbitrage Administratif
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* 1. Remboursement Partiel (Client absent) */}
                    <button
                      onClick={() => handleResolve(item.id, 'refund_partial')}
                      disabled={isProcessing}
                      className="px-3 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center disabled:opacity-50"
                    >
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" />
                        Remboursement Partiel
                      </span>
                      <span className="text-[10px] font-medium opacity-90">
                        (Client absent - Livreur payé)
                      </span>
                    </button>

                    {/* 2. Remboursement Total */}
                    <button
                      onClick={() => handleResolve(item.id, 'refund_complete')}
                      disabled={isProcessing}
                      className="px-3 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center disabled:opacity-50"
                    >
                      <span>Remboursement 100%</span>
                      <span className="text-[10px] font-medium opacity-90">(Acheteur indemnisé total)</span>
                    </button>
                  </div>

                  {/* 3. Forcer Livraison */}
                  <button
                    onClick={() => handleResolve(item.id, 'deliver')}
                    disabled={isProcessing}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Forcer validation livraison (Payer vendeur & livreur)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
