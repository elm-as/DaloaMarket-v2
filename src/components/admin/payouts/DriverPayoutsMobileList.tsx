import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Phone, RefreshCw } from 'lucide-react';
import { cn, formatDate, formatPrice } from '../../../lib/utils';
import type { AdminDeliveryItem } from '../deliveries/types';

interface DriverPayoutsMobileListProps {
  items: AdminDeliveryItem[];
  processingId: string | null;
  isCash: (delivery: AdminDeliveryItem) => boolean;
  onTriggerPayout: (item: AdminDeliveryItem) => void;
}

export const DriverPayoutsMobileList: React.FC<DriverPayoutsMobileListProps> = ({
  items,
  processingId,
  isCash,
  onTriggerPayout,
}) => (
  <ul className="divide-y divide-slate-100 md:hidden" aria-label="Courses et versements livreurs">
    {items.map((item) => {
      const fee = item.delivery_price || item.order?.delivery_fee || 0;
      const platformFee = Math.round(fee * 0.1);
      const netFee = Math.max(0, fee - platformFee);
      const payout = item.driver_payout;
      const isPaid = payout?.status === 'paid' || payout?.status === 'completed';
      const isPending = payout?.status === 'pending' || payout?.status === 'processing';
      const isFailed = payout?.status === 'failed';
      const isMissing = item.status === 'delivered' && !payout && !isCash(item);
      const isProcessing = processingId === item.id;

      return (
        <li key={item.id} className="p-3.5 space-y-2.5 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-mono font-bold text-slate-900">#{item.id.slice(0, 8)}</span>
              <span className="block text-[10px] text-slate-400 tabular-nums">
                {formatDate(item.created_at)}
              </span>
            </div>
            {isPaid ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Payé ({payout?.withdraw_mode?.replace('-ci', '') || 'Wave'})
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200">
                <Clock className="w-3 h-3" /> En attente
              </span>
            ) : isFailed ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200">
                <AlertTriangle className="w-3 h-3" /> Échec
              </span>
            ) : isMissing ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-red-800 bg-red-100 border border-red-300">
                Non généré
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 italic">
                {isCash(item) && item.status === 'delivered'
                  ? 'Espèces à la remise'
                  : item.status === 'cancelled'
                  ? 'Annulée'
                  : 'En cours'}
              </span>
            )}
          </div>

          <div>
            <div className="font-bold text-slate-800">{item.delivery_person?.name || 'Non assigné'}</div>
            <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500 tabular-nums">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{item.delivery_person?.payout_number || item.delivery_person?.phone || 'N/A'}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2">
            <div>
              <span className="block text-[10px] text-slate-500">Prix client</span>
              <span className="font-mono tabular-nums font-semibold text-slate-800">{formatPrice(fee)}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500">Com. 10%</span>
              <span className="font-mono tabular-nums text-slate-500">-{formatPrice(platformFee)}</span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] text-slate-500">Net livreur</span>
              <span className="font-mono tabular-nums font-semibold text-emerald-800">{formatPrice(netFee)}</span>
            </div>
          </div>

          {(isMissing || isFailed) && (
            <button
              type="button"
              onClick={() => onTriggerPayout(item)}
              disabled={isProcessing}
              className={cn(
                'w-full min-h-[40px] px-3 py-2 font-bold rounded-lg text-xs transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-xs',
                isMissing ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' : 'bg-rose-600 hover:bg-rose-500 text-white'
              )}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isProcessing && 'animate-spin')} />
              <span>{isMissing ? 'Déclencher le virement' : 'Réessayer le virement'}</span>
            </button>
          )}
        </li>
      );
    })}
  </ul>
);
