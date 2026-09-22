import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, WalletCards, ShieldAlert, History, Truck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';
import { cn } from '../../lib/utils';
import type { PayoutItem, DisputeDeliveryItem, PayoutStats, FinancialAuditLogItem } from './payouts/types';
import { type AdminDeliveryItem, isDriverDelivery } from './deliveries/types';
import { PayoutStatsCards } from './payouts/PayoutStatsCards';
import { PayoutSyncActionCard } from './payouts/PayoutSyncActionCard';
import { PayoutsTable } from './payouts/PayoutsTable';
import { DisputeSettlementSection } from './payouts/DisputeSettlementSection';
import { FinancialAuditLogsTable } from './payouts/FinancialAuditLogsTable';
import { DriverPayoutsFlowTable } from './payouts/DriverPayoutsFlowTable';

export const AdminPayoutsTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [disputes, setDisputes] = useState<DisputeDeliveryItem[]>([]);
  const [deliveries, setDeliveries] = useState<AdminDeliveryItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<FinancialAuditLogItem[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'payouts' | 'driver_flows' | 'disputes' | 'audit'>('payouts');
  const [stats, setStats] = useState<PayoutStats>({
    totalPaidAmount: 0,
    totalPaidCount: 0,
    totalPendingAmount: 0,
    totalPendingCount: 0,
    totalFailedAmount: 0,
    totalFailedCount: 0,
    sellerPaidAmount: 0,
    driverPaidAmount: 0,
    refundPaidAmount: 0,
  });

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      // 1. Charger les payouts
      const { data: rawPayouts, error: pErr } = await (supabase as any)
        .from('payouts')
        .select('*')
        .order('created_at', { ascending: false });

      if (pErr) throw pErr;

      // Charger les utilisateurs associés aux payouts
      const userIds = [...new Set(((rawPayouts as any[]) || []).map((p) => p.user_id).filter(Boolean))];
      let userMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name, phone, role')
          .in('id', userIds);
        userMap = new Map((users || []).map((u: any) => [u.id, u]));
      }

      const mergedPayouts: PayoutItem[] = ((rawPayouts as any[]) || []).map((p) => ({
        ...p,
        user: userMap.get(p.user_id) || null,
      }));
      setPayouts(mergedPayouts);

      // Calculer les métriques
      let totalPaidAmount = 0;
      let totalPaidCount = 0;
      let totalPendingAmount = 0;
      let totalPendingCount = 0;
      let totalFailedAmount = 0;
      let totalFailedCount = 0;
      let sellerPaidAmount = 0;
      let driverPaidAmount = 0;
      let refundPaidAmount = 0;

      for (const p of mergedPayouts) {
        const amt = Number(p.amount) || 0;
        if (p.status === 'paid' || p.status === 'completed') {
          totalPaidAmount += amt;
          totalPaidCount++;
          if (p.type === 'seller') sellerPaidAmount += amt;
          else if (p.type === 'delivery') driverPaidAmount += amt;
          else if (p.type === 'refund') refundPaidAmount += amt;
        } else if (p.status === 'pending' || p.status === 'processing') {
          totalPendingAmount += amt;
          totalPendingCount++;
        } else if (p.status === 'failed') {
          totalFailedAmount += amt;
          totalFailedCount++;
        }
      }

      setStats({
        totalPaidAmount,
        totalPaidCount,
        totalPendingAmount,
        totalPendingCount,
        totalFailedAmount,
        totalFailedCount,
        sellerPaidAmount,
        driverPaidAmount,
        refundPaidAmount,
      });

      // 2. Charger les courses avec litiges ou récentes pour l'arbitrage
      const { data: rawAssignments } = await (supabase as any)
        .from('delivery_assignments')
        .select('*, delivery_person:delivery_persons(*)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (rawAssignments && rawAssignments.length > 0) {
        const orderIds = [...new Set(((rawAssignments as any[]) || []).map((a) => a.order_id).filter(Boolean))];
        const { data: orders } = await supabase
          .from('orders')
          .select('id, status, product_amount, delivery_fee, total_amount, delivery_mode, delivery_address, buyer_id, seller_id')
          .in('id', orderIds);

        const orderMap = new Map((orders || []).map((o: any) => [o.id, o]));
        const allActorIds = [
          ...new Set(
            (orders || []).flatMap((o: any) => [o.buyer_id, o.seller_id])
              .concat(((rawAssignments as any[]) || []).map((a) => a.delivery_person?.user_id))
              .filter(Boolean)
          ),
        ];

        let actorsMap = new Map<string, any>();
        if (allActorIds.length > 0) {
          const { data: actors } = await supabase
            .from('users')
            .select('id, full_name, phone')
            .in('id', allActorIds);
          actorsMap = new Map((actors || []).map((u: any) => [u.id, u]));
        }

        const payoutByAssignmentId = new Map<string, PayoutItem>();
        mergedPayouts.forEach((p) => {
          if (p.type === 'delivery' && p.delivery_assignment_id) {
            payoutByAssignmentId.set(p.delivery_assignment_id, p);
          }
        });

        const mergedDeliveries: AdminDeliveryItem[] = ((rawAssignments as any[]) || []).map((a) => {
          const order = orderMap.get(a.order_id) as any;
          const dp = a.delivery_person as any;
          const driverName = dp?.name || (dp?.user_id ? actorsMap.get(dp.user_id)?.full_name : null) || 'Inconnu';
          const driverPhone = dp?.phone || (dp?.user_id ? actorsMap.get(dp.user_id)?.phone : null) || null;
          const driverPayout = payoutByAssignmentId.get(a.id) || null;

          return {
            ...a,
            delivery_person: dp ? { ...dp, name: driverName, phone: driverPhone } : null,
            order: order
              ? {
                  ...order,
                  buyer: actorsMap.get(order.buyer_id) || null,
                  seller: actorsMap.get(order.seller_id) || null,
                }
              : null,
            driver_payout: driverPayout,
          };
        });

        setDeliveries(mergedDeliveries);
        setDisputes(mergedDeliveries as any);
      }

      // 3. Charger les journaux d'audit financier
      const { data: rawLogs } = await (supabase as any)
        .from('admin_financial_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (rawLogs && rawLogs.length > 0) {
        const adminIds = [...new Set(((rawLogs as any[]) || []).map((l) => l.admin_id).filter(Boolean))];
        let adminMap = new Map<string, any>();
        if (adminIds.length > 0) {
          const { data: admins } = await supabase
            .from('users')
            .select('id, full_name, phone, role')
            .in('id', adminIds);
          adminMap = new Map((admins || []).map((u: any) => [u.id, u]));
        }

        const mergedLogs: FinancialAuditLogItem[] = ((rawLogs as any[]) || []).map((l) => ({
          ...l,
          admin: adminMap.get(l.admin_id) || null,
        }));
        setAuditLogs(mergedLogs);
      } else {
        setAuditLogs([]);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des versements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchData} />;
  }

  const openDisputeCount = disputes.filter((d) => d.status === 'disputed').length;
  const missingOrPendingDriverCount = deliveries.filter(
    (d) => isDriverDelivery(d) && d.status === 'delivered' && (!d.driver_payout || (d.driver_payout.status !== 'paid' && d.driver_payout.status !== 'completed'))
  ).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Versements & Règlements (Payouts)</h2>
          <p className="text-xs text-slate-500 mt-1">
            Supervisez les déboursements MoneyFusion, forcez les synchronisations de secours et arbitrez les remboursements partiels.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="self-start sm:self-center flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          Actualiser
        </button>
      </div>

      {/* KPI Cards */}
      <PayoutStatsCards stats={stats} />

      {/* Action de secours Railway */}
      <PayoutSyncActionCard onSyncCompleted={fetchData} />

      {/* Sub-tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('payouts')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 relative -bottom-[2px] transition-all whitespace-nowrap',
            activeSubTab === 'payouts'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <WalletCards className="w-4 h-4" />
          <span>File des Versements</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono tabular-nums">
            {payouts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('driver_flows')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 relative -bottom-[2px] transition-all whitespace-nowrap',
            activeSubTab === 'driver_flows'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <Truck className="w-4 h-4" />
          <span>Flux Paiements Livreurs</span>
          {missingOrPendingDriverCount > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold font-mono tabular-nums">
              {missingOrPendingDriverCount} à régler
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono tabular-nums">
              {deliveries.filter((d) => d.delivery_person_id || d.driver_payout || d.status === 'delivered').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('disputes')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 relative -bottom-[2px] transition-all whitespace-nowrap',
            activeSubTab === 'disputes'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Litiges & Remboursements Partiels</span>
          {openDisputeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700 font-bold font-mono tabular-nums">
              {openDisputeCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 relative -bottom-[2px] transition-all whitespace-nowrap',
            activeSubTab === 'audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <History className="w-4 h-4" />
          <span>Journal d'Audit Financier</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-700 font-mono tabular-nums">
            {auditLogs.length}
          </span>
        </button>
      </div>

      {/* View Content */}
      {activeSubTab === 'payouts' ? (
        <PayoutsTable payouts={payouts} onRefresh={fetchData} />
      ) : activeSubTab === 'driver_flows' ? (
        <DriverPayoutsFlowTable deliveries={deliveries} payouts={payouts} onRefresh={fetchData} />
      ) : activeSubTab === 'disputes' ? (
        <DisputeSettlementSection disputes={disputes} onDisputeResolved={fetchData} />
      ) : (
        <FinancialAuditLogsTable logs={auditLogs} onRefresh={fetchData} />
      )}
    </motion.div>
  );
};
