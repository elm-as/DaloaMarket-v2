import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Truck, Search, RefreshCw, WalletCards } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../../lib/utils';
import { DeliveryCard } from './deliveries/DeliveryCard';
import type { AdminDeliveryItem, DeliveryTabFilter } from './deliveries/types';
import { isDriverDelivery } from './deliveries/types';
import type { PayoutItem } from './payouts/types';

export const AdminDeliveriesTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<AdminDeliveryItem[]>([]);
  const [filter, setFilter] = useState<DeliveryTabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async () => {
    setError(null);
    try {
      // 1. Charger les attributions de livraisons
      const { data: rawAssignments, error: err } = await (supabase as any)
        .from('delivery_assignments')
        .select('*, delivery_person:delivery_persons(*)')
        .order('created_at', { ascending: false });

      if (err) throw err;
      if (!rawAssignments || rawAssignments.length === 0) {
        setDeliveries([]);
        return;
      }

      // 2. Charger les commandes associées
      const orderIds = [...new Set(((rawAssignments as any[]) || []).map((a) => a.order_id).filter(Boolean))];
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status, product_amount, delivery_fee, total_amount, delivery_mode, delivery_address, buyer_id, seller_id')
        .in('id', orderIds);

      const orderMap = new Map((orders || []).map((o: any) => [o.id, o]));

      // 3. Charger les utilisateurs (acheteurs, vendeurs, livreurs, médiateurs)
      const driverUserIds = [...new Set(((rawAssignments as any[]) || []).map((a) => a.delivery_person?.user_id).filter(Boolean))];
      const orderUserIds = [...new Set((orders || []).flatMap((o: any) => [o.buyer_id, o.seller_id]).filter(Boolean))];
      const mediatorUserIds = [...new Set(((rawAssignments as any[]) || []).map((a) => a.resolved_by).filter(Boolean))];
      const allUserIds = [...new Set([...orderUserIds, ...driverUserIds, ...mediatorUserIds])];

      let userMap = new Map<string, any>();
      if (allUserIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name, phone')
          .in('id', allUserIds);
        userMap = new Map((users || []).map((u: any) => [u.id, u]));
      }

      // 4. Charger TOUS les payouts livreurs pour lier les flux financiers
      const assignmentIds = ((rawAssignments as any[]) || []).map((a) => a.id);
      const { data: rawPayouts } = await (supabase as any)
        .from('payouts')
        .select('*')
        .eq('type', 'delivery');

      const payoutByAssignmentId = new Map<string, PayoutItem>();
      (rawPayouts || []).forEach((p: PayoutItem) => {
        if (p.delivery_assignment_id) {
          payoutByAssignmentId.set(p.delivery_assignment_id, p);
        }
      });

      // 5. Fusionner les données avec le statut financier du livreur
      const merged: AdminDeliveryItem[] = ((rawAssignments as any[]) || []).map((a) => {
        const order = orderMap.get(a.order_id) as any;
        const dp = a.delivery_person as any;
        const driverName = dp?.name || (dp?.user_id ? userMap.get(dp.user_id)?.full_name : null) || 'Inconnu';
        const driverPhone = dp?.phone || (dp?.user_id ? userMap.get(dp.user_id)?.phone : null) || null;
        const mediator = a.resolved_by ? userMap.get(a.resolved_by) : null;
        const driverPayout = payoutByAssignmentId.get(a.id) || null;

        return {
          ...a,
          delivery_person: dp ? { ...dp, name: driverName, phone: driverPhone } : null,
          mediator: mediator,
          driver_payout: driverPayout,
          order: order
            ? {
                ...order,
                buyer: userMap.get(order.buyer_id) ?? null,
                seller: userMap.get(order.seller_id) ?? null,
              }
            : null,
        };
      });

      setDeliveries(merged);

      // Générer URLs signées pour photos de livraison
      const urls: Record<string, string> = {};
      for (const item of merged) {
        if (item.delivery_photo_url) {
          try {
            const marker = '/storage/v1/object/public/delivery-photos/';
            const idx = item.delivery_photo_url.indexOf(marker);
            if (idx !== -1) {
              const path = item.delivery_photo_url.substring(idx + marker.length).split('#')[0].split('?')[0];
              const { data: signData, error: signError } = await supabase.storage
                .from('delivery-photos')
                .createSignedUrl(path, 3600);
              if (signData?.signedUrl && !signError) {
                urls[item.id] = signData.signedUrl;
              }
            }
          } catch (e) {
            console.error('Erreur signature URL photo:', e);
          }
        }
      }
      setPhotoUrls(urls);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des livraisons');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDeliveries();
  };

  const handleResolveDispute = async (
    assignmentId: string,
    action: 'deliver' | 'cancel' | 'refund_complete' | 'refund_partial'
  ) => {
    setProcessing(assignmentId);
    try {
      const { data, error: rpcErr } = await (supabase as any).rpc('resolve_delivery_dispute', {
        p_assignment_id: assignmentId,
        p_action: action,
      });
      if (rpcErr) throw rpcErr;

      let msg = '';
      if (action === 'deliver') msg = 'Litige résolu : Commande livrée (fonds libérés)';
      else if (action === 'refund_complete') msg = 'Litige résolu : Commande annulée et acheteur remboursé à 100%';
      else if (action === 'refund_partial') msg = 'Litige résolu : Remboursement produit, livreur payé';
      else msg = 'Litige résolu : Attribution annulée';

      toast.success(msg);
      fetchDeliveries();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la résolution du litige');
    } finally {
      setProcessing(null);
    }
  };

  // Filtrage
  const filteredDeliveries = deliveries.filter((item) => {
    if (filter === 'disputed' && item.status !== 'disputed') return false;
    if (filter === 'delivered' && item.status !== 'delivered') return false;
    if (filter === 'active' && !['pending_seller_confirmation', 'awaiting_pickup', 'accepted', 'picked_up', 'in_transit'].includes(item.status)) return false;
    if (filter === 'unpaid_driver') {
      if (!isDriverDelivery(item)) return false;
      if (item.status !== 'delivered') return false;
      const isPaid = item.driver_payout?.status === 'paid' || item.driver_payout?.status === 'completed';
      if (isPaid) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const buyerName = item.order?.buyer?.full_name?.toLowerCase() || '';
      const sellerName = item.order?.seller?.full_name?.toLowerCase() || '';
      const driverName = item.delivery_person?.name?.toLowerCase() || '';
      const idStr = item.id.toLowerCase();
      return buyerName.includes(q) || sellerName.includes(q) || driverName.includes(q) || idStr.includes(q);
    }

    return true;
  });

  const unpaidCount = deliveries.filter(
    (d) => isDriverDelivery(d) && d.status === 'delivered' && d.driver_payout?.status !== 'paid' && d.driver_payout?.status !== 'completed'
  ).length;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchDeliveries} />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Suivi des Livraisons & Flux Livreurs</h2>
          <p className="text-xs text-slate-500 mt-1">
            Supervisez les courses actives, vérifiez les versements livreurs et tranchez les litiges en cours.
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

      {/* Tabs / Filters */}
      <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto min-w-max">
        {[
          { key: 'all', label: 'Toutes', count: deliveries.length },
          { key: 'unpaid_driver', label: 'Paiements Livreurs à Régler', count: unpaidCount, highlight: unpaidCount > 0 },
          { key: 'disputed', label: 'Litiges', count: deliveries.filter((d) => d.status === 'disputed').length, alert: true },
          { key: 'active', label: 'En cours', count: deliveries.filter((d) => ['pending_seller_confirmation', 'awaiting_pickup', 'accepted', 'picked_up', 'in_transit'].includes(d.status)).length },
          { key: 'delivered', label: 'Livrées', count: deliveries.filter((d) => d.status === 'delivered').length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as DeliveryTabFilter)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-all border-b-2 relative -bottom-[2px]',
              filter === tab.key
                ? 'border-amber-500 text-amber-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono tabular-nums',
                tab.highlight
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : tab.alert && tab.count > 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-600'
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par acheteur, vendeur, livreur ou ID de course..."
          className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
        />
      </div>

      {/* Deliveries List */}
      {filteredDeliveries.length === 0 ? (
        <EmptyState title="Aucune course correspondante" icon={<Truck size={48} />} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDeliveries.map((item) => (
            <DeliveryCard
              key={item.id}
              item={item}
              photoUrl={photoUrls[item.id]}
              isProcessing={processing === item.id}
              onResolveDispute={handleResolveDispute}
              onRefresh={fetchDeliveries}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};
