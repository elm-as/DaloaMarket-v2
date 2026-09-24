import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { PayoutItem, DisputeDeliveryItem, PayoutStats, FinancialAuditLogItem } from './types';
import type { AdminDeliveryItem } from '../deliveries/types';

const EMPTY_STATS: PayoutStats = {
  totalPaidAmount: 0,
  totalPaidCount: 0,
  totalPendingAmount: 0,
  totalPendingCount: 0,
  totalFailedAmount: 0,
  totalFailedCount: 0,
  sellerPaidAmount: 0,
  driverPaidAmount: 0,
  refundPaidAmount: 0,
};

/**
 * Données financières de l'administration : versements, courses (avec leur
 * versement livreur et leurs litiges) et journal d'audit. Partagé par les
 * pages Versements et Litiges, qui chargeaient auparavant la même chose dans
 * un seul onglet.
 */
export function useAdminFinanceData() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [disputes, setDisputes] = useState<DisputeDeliveryItem[]>([]);
  const [deliveries, setDeliveries] = useState<AdminDeliveryItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<FinancialAuditLogItem[]>([]);
  const [stats, setStats] = useState<PayoutStats>(EMPTY_STATS);

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
      // Les 50 courses récentes, plus TOUTES les courses en litige : un litige
      // plus ancien que les 50 dernières courses disparaissait de l'écran.
      const [{ data: recentAssignments }, { data: disputedAssignments }] = await Promise.all([
        (supabase as any)
          .from('delivery_assignments')
          .select('*, delivery_person:delivery_persons(*)')
          .order('created_at', { ascending: false })
          .limit(50),
        (supabase as any)
          .from('delivery_assignments')
          .select('*, delivery_person:delivery_persons(*)')
          .eq('status', 'disputed'),
      ]);
      const seenIds = new Set<string>();
      const rawAssignments = [...(disputedAssignments || []), ...(recentAssignments || [])].filter((a: any) => {
        if (seenIds.has(a.id)) return false;
        seenIds.add(a.id);
        return true;
      });

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

  const refresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return { loading, refreshing, error, payouts, disputes, deliveries, auditLogs, stats, refresh, reload: fetchData };
}
