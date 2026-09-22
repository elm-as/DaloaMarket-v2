import React, { useState } from 'react';
import { Search, ShieldAlert, User, Clock, FileText, Phone, ArrowUpRight } from 'lucide-react';
import { cn, formatPrice, formatDate } from '../../../lib/utils';
import type { FinancialAuditLogItem } from './types';

interface FinancialAuditLogsTableProps {
  logs: FinancialAuditLogItem[];
  onRefresh: () => void;
}

export const FinancialAuditLogsTable: React.FC<FinancialAuditLogsTableProps> = ({ logs }) => {
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [activeDetailLog, setActiveDetailLog] = useState<FinancialAuditLogItem | null>(null);

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'payout_force_sync':
        return { label: 'Forçage Synchro Payouts', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'payout_retry':
        return { label: 'Réessai Versement', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'dispute_refund_partial':
        return { label: 'Remboursement Partiel (Livreur Payé)', color: 'bg-orange-100 text-orange-800 border-orange-300' };
      case 'dispute_refund_complete':
        return { label: 'Remboursement 100%', color: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'dispute_deliver':
        return { label: 'Validation Forcée Livraison', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'dispute_cancelled_reassign':
        return { label: 'Annulation Attribution', color: 'bg-slate-100 text-slate-800 border-slate-300' };
      default:
        return { label: type, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (selectedAction !== 'all' && log.action_type !== selectedAction) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const adminName = log.admin?.full_name?.toLowerCase() || '';
      const phone = log.recipient_phone?.toLowerCase() || '';
      const target = log.target_id?.toLowerCase() || '';
      const action = log.action_type.toLowerCase();
      return adminName.includes(q) || phone.includes(q) || target.includes(q) || action.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Banner Notice */}
      <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl border border-slate-800 flex items-start gap-3 text-xs">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h4 className="font-black text-white uppercase tracking-wider text-[11px]">
            Journal d'Audit Financier Immuable
          </h4>
          <p className="text-slate-400 leading-relaxed">
            Chaque arbitrage d'argent, versement forcé ou remboursement est tracé avec l'identifiant de l'administrateur,
            l'heure exacte et les bénéficiaires pour garantir une transparence totale des opérations.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par admin, bénéficiaire, course ou action..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        {/* Action Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { key: 'all', label: 'Toutes les opérations' },
            { key: 'payout_force_sync', label: 'Forçage Synchro' },
            { key: 'dispute_refund_partial', label: 'Remb. Partiels' },
            { key: 'dispute_refund_complete', label: 'Remb. 100%' },
            { key: 'dispute_deliver', label: 'Validation Forcée' },
            { key: 'payout_retry', label: 'Réessais' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setSelectedAction(item.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                selectedAction === item.key
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Aucune opération financière enregistrée pour ces critères.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Administrateur</th>
                  <th className="py-3 px-4">Opération</th>
                  <th className="py-3 px-4 text-right">Montant</th>
                  <th className="py-3 px-4">Bénéficiaire / Cible</th>
                  <th className="py-3 px-4 text-right">Contexte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const meta = getActionLabel(log.action_type);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{formatDate(log.created_at)}</div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(log.created_at).toLocaleTimeString('fr-FR')}</span>
                        </div>
                      </td>

                      {/* Admin */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.admin?.full_name || 'Admin'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          {log.admin?.role || 'Administrateur'}
                        </div>
                      </td>

                      {/* Operation */}
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border',
                            meta.color
                          )}
                        >
                          {meta.label}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="font-mono tabular-nums font-black text-slate-950 text-sm">
                          {log.amount != null ? formatPrice(log.amount) : '—'}
                        </span>
                      </td>

                      {/* Beneficiary */}
                      <td className="py-3 px-4">
                        {log.recipient_phone ? (
                          <div className="flex items-center gap-1 font-mono text-slate-800 font-semibold">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{log.recipient_phone}</span>
                          </div>
                        ) : log.target_id ? (
                          <div className="font-mono text-[11px] text-slate-600">
                            Réf: #{log.target_id.slice(0, 10)}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Context / View */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setActiveDetailLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-[11px] transition-colors"
                        >
                          <FileText className="w-3 h-3 text-slate-500" />
                          Détails
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {activeDetailLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Détail de l'Opération Financière</h3>
                <p className="text-xs text-slate-400">{formatDate(activeDetailLog.created_at)}</p>
              </div>
              <button
                onClick={() => setActiveDetailLog(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Admin responsable :</span>
                <span className="font-bold text-slate-800">{activeDetailLog.admin?.full_name || 'Admin'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Action :</span>
                <span className="font-mono font-bold text-slate-800">{activeDetailLog.action_type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Montant :</span>
                <span className="font-mono tabular-nums font-black text-slate-950">
                  {activeDetailLog.amount != null ? formatPrice(activeDetailLog.amount) : 'N/A'}
                </span>
              </div>
              {activeDetailLog.recipient_phone && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Téléphone bénéficiaire :</span>
                  <span className="font-mono font-bold text-slate-800">{activeDetailLog.recipient_phone}</span>
                </div>
              )}
              {activeDetailLog.target_id && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Identifiant cible :</span>
                  <span className="font-mono text-slate-600">#{activeDetailLog.target_id}</span>
                </div>
              )}
            </div>

            {/* JSON Context */}
            {activeDetailLog.details && Object.keys(activeDetailLog.details).length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payload technique</span>
                <pre className="p-3 bg-slate-900 text-amber-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-40">
                  {JSON.stringify(activeDetailLog.details, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveDetailLog(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
