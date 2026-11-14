import React from 'react';
import { Clock, FileText, Phone, User } from 'lucide-react';
import { cn, formatDate, formatPrice } from '../../../lib/utils';
import type { FinancialAuditLogItem } from './types';

interface FinancialAuditMobileListProps {
  logs: FinancialAuditLogItem[];
  getActionLabel: (actionType: string) => { label: string; color: string };
  onSelectDetail: (log: FinancialAuditLogItem) => void;
}

export const FinancialAuditMobileList: React.FC<FinancialAuditMobileListProps> = ({
  logs,
  getActionLabel,
  onSelectDetail,
}) => (
  <ul className="divide-y divide-slate-100 md:hidden" aria-label="Journal d'audit financier">
    {logs.map((log) => {
      const meta = getActionLabel(log.action_type);

      return (
        <li key={log.id} className="p-3.5 space-y-2.5 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-slate-900">{formatDate(log.created_at)}</div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono tabular-nums">
                <Clock className="w-3 h-3" />
                <span>{new Date(log.created_at).toLocaleTimeString('fr-FR')}</span>
              </div>
            </div>
            <span className="font-mono tabular-nums font-semibold text-slate-950 text-sm">
              {log.amount != null ? formatPrice(log.amount) : '—'}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                meta.color
              )}
            >
              {meta.label}
            </span>
            <div className="flex items-center gap-1 text-slate-700 font-semibold">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{log.admin?.full_name || 'Admin'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50">
            <div className="text-slate-600">
              {log.recipient_phone ? (
                <span className="inline-flex items-center gap-1 font-mono font-semibold tabular-nums">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {log.recipient_phone}
                </span>
              ) : log.target_id ? (
                <span className="font-mono text-[11px]">Réf: #{log.target_id.slice(0, 10)}</span>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onSelectDetail(log)}
              className="min-h-[38px] inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Détails
            </button>
          </div>
        </li>
      );
    })}
  </ul>
);
