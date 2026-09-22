import React from 'react';
import { CheckCircle2, Clock, AlertOctagon, TrendingUp } from 'lucide-react';
import { Card } from '../../ui/Card';
import { formatPrice } from '../../../lib/utils';
import type { PayoutStats } from './types';

interface PayoutStatsCardsProps {
  stats: PayoutStats;
}

export const PayoutStatsCards: React.FC<PayoutStatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Payé */}
      <Card className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            Total Décaissé (Payé)
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <p className="mt-3 text-2xl font-black text-emerald-950 font-mono tabular-nums tracking-tight">
          {formatPrice(stats.totalPaidAmount)}
        </p>
        <p className="mt-1 text-xs text-emerald-700 font-semibold font-mono tabular-nums">
          {stats.totalPaidCount} virement{stats.totalPaidCount > 1 ? 's' : ''} réussi{stats.totalPaidCount > 1 ? 's' : ''}
        </p>
      </Card>

      {/* 2. En attente / En cours */}
      <Card className="p-4 rounded-2xl border border-amber-100 bg-amber-50/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
            En Attente / En Cours
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <p className="mt-3 text-2xl font-black text-amber-950 font-mono tabular-nums tracking-tight">
          {formatPrice(stats.totalPendingAmount)}
        </p>
        <p className="mt-1 text-xs text-amber-700 font-semibold font-mono tabular-nums">
          {stats.totalPendingCount} versement{stats.totalPendingCount > 1 ? 's' : ''} à synchroniser
        </p>
      </Card>

      {/* 3. Échecs de Versement */}
      <Card className="p-4 rounded-2xl border border-rose-100 bg-rose-50/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
            Échecs / Rejets
          </span>
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <AlertOctagon className="w-4 h-4" />
          </div>
        </div>
        <p className="mt-3 text-2xl font-black text-rose-950 font-mono tabular-nums tracking-tight">
          {formatPrice(stats.totalFailedAmount)}
        </p>
        <p className="mt-1 text-xs text-rose-700 font-semibold font-mono tabular-nums">
          {stats.totalFailedCount} incident{stats.totalFailedCount > 1 ? 's' : ''} à corriger
        </p>
      </Card>

      {/* 4. Répartition par Type */}
      <Card className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Flux par Destination
          </span>
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="pt-1 text-xs space-y-1">
          <div className="flex justify-between items-center text-slate-700">
            <span className="font-medium text-slate-500">Vendeurs :</span>
            <span className="font-bold font-mono tabular-nums">{formatPrice(stats.sellerPaidAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-700">
            <span className="font-medium text-slate-500">Livreurs :</span>
            <span className="font-bold font-mono tabular-nums">{formatPrice(stats.driverPaidAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-700">
            <span className="font-medium text-slate-500">Remboursements :</span>
            <span className="font-bold font-mono tabular-nums">{formatPrice(stats.refundPaidAmount)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
