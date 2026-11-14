import React from 'react';
import { AlertCircle, Copy, Phone, RefreshCw } from 'lucide-react';
import { cn, formatDate, formatPrice } from '../../../lib/utils';
import type { PayoutItem } from './types';

interface PayoutsMobileListProps {
  payouts: PayoutItem[];
  retryingId: string | null;
  onCopy: (text: string, label: string) => void;
  onRetry: (payoutId: string) => void;
}

export const PayoutsMobileList: React.FC<PayoutsMobileListProps> = ({
  payouts,
  retryingId,
  onCopy,
  onRetry,
}) => (
  <ul className="divide-y divide-slate-100 md:hidden" aria-label="Liste des versements">
    {payouts.map((p) => {
      const isPaid = p.status === 'paid' || p.status === 'completed';
      const isFailed = p.status === 'failed';
      const isProcessing = p.status === 'processing';
      const isRetrying = retryingId === p.id;

      return (
        <li key={p.id} className="p-3.5 space-y-2.5 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-slate-900">{formatDate(p.created_at)}</div>
              <button
                type="button"
                onClick={() => onCopy(p.id, 'ID')}
                className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 hover:text-slate-800"
                title="Copier ID"
              >
                <span>#{p.id.slice(0, 8)}</span>
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <div className="text-right">
              <div className="font-mono tabular-nums font-semibold text-slate-950 text-sm">
                {formatPrice(p.amount)}
              </div>
              <span
                className={cn(
                  'mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold',
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
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div>
              <div className="font-bold text-slate-800">{p.user?.full_name || 'Destinataire'}</div>
              <div className="flex items-center gap-1 font-mono text-slate-500 mt-0.5 tabular-nums">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{p.recipient_phone}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
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
              <span className="font-semibold text-slate-700 capitalize">
                {p.withdraw_mode?.replace('-ci', '').replace('_', ' ') || 'Mobile Money'}
              </span>
            </div>
          </div>

          {p.failure_reason ? (
            <div className="flex items-start gap-1.5 rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] text-rose-700 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{p.failure_reason}</span>
            </div>
          ) : p.provider_token ? (
            <div className="font-mono text-[10px] text-slate-500 truncate">
              Token : {p.provider_token}
            </div>
          ) : null}

          {isFailed && (
            <button
              type="button"
              onClick={() => onRetry(p.id)}
              disabled={isRetrying}
              className="w-full min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isRetrying && 'animate-spin')} />
              {isRetrying ? 'Envoi...' : 'Réessayer le versement'}
            </button>
          )}
        </li>
      );
    })}
  </ul>
);
