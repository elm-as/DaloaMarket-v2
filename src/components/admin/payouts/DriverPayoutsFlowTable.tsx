import React, { useState } from 'react';
import { Search, RefreshCw, CheckCircle2, Clock, AlertTriangle, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn, formatPrice, formatDate } from '../../../lib/utils';
import { triggerDriverPayout } from '../../../lib/adminPayouts';
import { type AdminDeliveryItem, isDriverDelivery } from '../deliveries/types';
import type { PayoutItem } from './types';
import { AdminStatGrid, AdminStatCard } from '../ui/AdminUI';

interface DriverPayoutsFlowTableProps {
  deliveries: AdminDeliveryItem[];
  payouts: PayoutItem[];
  onRefresh: () => void;
}

export const DriverPayoutsFlowTable: React.FC<DriverPayoutsFlowTableProps> = ({
  deliveries,
  payouts,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'failed' | 'missing'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filtrer uniquement les courses où un livreur est ou a été impliqué (exclut retraits en boutique)
  const driverDeliveries = deliveries.filter(
    (d) => isDriverDelivery(d) && (d.delivery_person_id != null || d.driver_payout != null || d.status === 'delivered')
  );

  // Calcul des métriques livreurs
  const driverPayouts = payouts.filter((p) => p.type === 'delivery');
  const totalPaidToDrivers = driverPayouts
    .filter((p) => p.status === 'paid' || p.status === 'completed')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalPendingForDrivers = driverPayouts
    .filter((p) => p.status === 'pending' || p.status === 'processing')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalPlatformCommissions = deliveries
    .filter((d) => isDriverDelivery(d) && d.status === 'delivered')
    .reduce((sum, d) => {
      const fee = d.delivery_price || d.order?.delivery_fee || 0;
      return sum + Math.ceil(fee * 0.10);
    }, 0);

  const missingPayoutsCount = deliveries.filter(
    (d) => isDriverDelivery(d) && d.status === 'delivered' && !d.driver_payout
  ).length;

  const handleTriggerDriverPayout = async (item: AdminDeliveryItem) => {
    if (!item.delivery_person?.id && !item.delivery_person_id) {
      toast.error('Aucun livreur associé');
      return;
    }
    setProcessingId(item.id);
    try {
      await triggerDriverPayout(item.id);
      toast.success('Versement programmé ! Synchronisation Railway en cours...');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du versement livreur');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredItems = driverDeliveries.filter((d) => {
    const p = d.driver_payout;
    const isPaid = p?.status === 'paid' || p?.status === 'completed';
    const isPending = p?.status === 'pending' || p?.status === 'processing';
    const isFailed = p?.status === 'failed';
    const isMissing = d.status === 'delivered' && !p;

    if (statusFilter === 'paid' && !isPaid) return false;
    if (statusFilter === 'pending' && !isPending) return false;
    if (statusFilter === 'failed' && !isFailed) return false;
    if (statusFilter === 'missing' && !isMissing) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const driverName = d.delivery_person?.name?.toLowerCase() || '';
      const phone = d.delivery_person?.phone?.toLowerCase() || '';
      const payoutPhone = p?.recipient_phone?.toLowerCase() || '';
      const id = d.id.toLowerCase();
      return driverName.includes(q) || phone.includes(q) || payoutPhone.includes(q) || id.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <AdminStatGrid>
        <AdminStatCard
          label="Versé aux livreurs"
          value={formatPrice(totalPaidToDrivers)}
          hint={`${driverPayouts.filter((p) => p.status === 'paid' || p.status === 'completed').length} virements`}
        />
        <AdminStatCard
          label="En attente d’envoi"
          value={formatPrice(totalPendingForDrivers)}
          tone={totalPendingForDrivers > 0 ? 'warning' : 'neutral'}
          hint={`${driverPayouts.filter((p) => p.status === 'pending' || p.status === 'processing').length} virements`}
        />
        <AdminStatCard label="Commission livraison (10 %)" value={formatPrice(totalPlatformCommissions)} />
        <AdminStatCard
          label="Non déclenchés"
          value={missingPayoutsCount}
          tone={missingPayoutsCount > 0 ? 'danger' : 'neutral'}
          hint={missingPayoutsCount > 0 ? 'Courses livrées sans versement' : 'À jour'}
          onClick={missingPayoutsCount > 0 ? () => setStatusFilter('missing') : undefined}
        />
      </AdminStatGrid>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par livreur, téléphone ou ID course..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { key: 'all', label: 'Toutes les courses' },
            { key: 'missing', label: 'Non générés', alert: missingPayoutsCount > 0 },
            { key: 'pending', label: 'En attente' },
            { key: 'paid', label: 'Payés' },
            { key: 'failed', label: 'Échecs' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setStatusFilter(item.key as any)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                statusFilter === item.key
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table of Driver Deliveries & Payouts */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Aucune course livreur ne correspond à ces critères.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Course / Date</th>
                  <th className="py-3 px-4">Livreur Associé</th>
                  <th className="py-3 px-4">Prix Client</th>
                  <th className="py-3 px-4">Com. 10%</th>
                  <th className="py-3 px-4 text-right">Net Livreur</th>
                  <th className="py-3 px-4">Statut Virement</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const fee = item.delivery_price || item.order?.delivery_fee || 0;
                  const platformFee = Math.ceil(fee * 0.10);
                  const netFee = Math.max(0, fee - platformFee);
                  const p = item.driver_payout;
                  const isPaid = p?.status === 'paid' || p?.status === 'completed';
                  const isPending = p?.status === 'pending' || p?.status === 'processing';
                  const isFailed = p?.status === 'failed';
                  const isMissing = item.status === 'delivered' && !p;
                  const isProcessing = processingId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Course */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 block">#{item.id.slice(0, 8)}</span>
                        <span className="text-[10px] text-slate-400">{formatDate(item.created_at)}</span>
                      </td>

                      {/* Driver */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{item.delivery_person?.name || 'Non assigné'}</div>
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{item.delivery_person?.payout_number || item.delivery_person?.phone || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Client Fee */}
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                        {formatPrice(fee)}
                      </td>

                      {/* Platform Fee */}
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-400">
                        -{formatPrice(platformFee)}
                      </td>

                      {/* Net Driver */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono tabular-nums font-semibold text-emerald-800 text-sm">
                          {formatPrice(netFee)}
                        </span>
                      </td>

                      {/* Payout Status */}
                      <td className="py-3 px-4">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Payé ({p?.withdraw_mode?.replace('-ci', '') || 'Wave'})
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
                          <span className="text-[11px] text-slate-400 italic">En cours</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {(isMissing || isFailed) && (
                          <button
                            onClick={() => handleTriggerDriverPayout(item)}
                            disabled={isProcessing}
                            className={cn(
                              'px-2.5 py-1 font-bold rounded-lg text-[11px] transition-all disabled:opacity-50 inline-flex items-center gap-1 shadow-xs',
                              isMissing ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' : 'bg-rose-600 hover:bg-rose-500 text-white'
                            )}
                          >
                            <RefreshCw className={cn('w-3 h-3', isProcessing && 'animate-spin')} />
                            <span>{isMissing ? 'Déclencher' : 'Réessayer'}</span>
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
