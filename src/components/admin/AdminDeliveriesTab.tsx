import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Search, RefreshCw, CheckCircle2, Store, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';
import { ErrorState } from '../ui/ErrorState';
import { confirmDialog } from '../ui/ConfirmDialog';
import { DeliveryCard } from './deliveries/DeliveryCard';
import { isDriverDelivery, type AdminDeliveryItem, type DeliveryTabFilter } from './deliveries/types';
import type { PayoutItem } from './payouts/types';
import {
  AdminPageHeader,
  AdminStatGrid,
  AdminStatCard,
  AdminTabs,
  AdminButton,
  AdminEmpty,
  AdminLoading,
  adminInputClass,
} from './ui/AdminUI';

const ACTIVE_STATUSES = [
  'pending',
  'paid',
  'funded',
  'confirmed',
  'pending_seller_confirmation',
  'awaiting_pickup',
  'accepted',
  'picked_up',
  'in_transit',
];

const DELIVERED_STATUSES = ['delivered', 'completed', 'auto_released'];

export const AdminDeliveriesTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<AdminDeliveryItem[]>([]);
  const [filter, setFilter] = useState<DeliveryTabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const fetchDeliveries = useCallback(async () => {
    setError(null);
    try {
      const [assignmentsRes, ordersRes, payoutsRes] = await Promise.all([
        (supabase as any)
          .from('delivery_assignments')
          .select('*, delivery_person:delivery_persons(*)')
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('id, status, product_amount, delivery_fee, total_amount, delivery_mode, payment_method, delivery_address, buyer_id, seller_id, listing_id, created_at, listing:listings(id, title, photos)')
          .order('created_at', { ascending: false })
          .limit(200),
        (supabase as any).from('payouts').select('*').eq('type', 'delivery'),
      ]);

      if (assignmentsRes.error) throw assignmentsRes.error;
      const rawAssignments = (assignmentsRes.data as any[]) || [];
      const orders = (ordersRes.data as any[]) || [];
      const rawPayouts = (payoutsRes.data as PayoutItem[]) || [];

      const orderMap = new Map(orders.map((o: any) => [o.id, o]));

      // Charger les commandes manquantes référencées par d'anciennes courses
      const missingOrderIds = [
        ...new Set(rawAssignments.map((a) => a.order_id).filter((id) => id && !orderMap.has(id))),
      ];
      if (missingOrderIds.length > 0) {
        const { data: extraOrders } = await supabase
          .from('orders')
          .select('id, status, product_amount, delivery_fee, total_amount, delivery_mode, payment_method, delivery_address, buyer_id, seller_id, listing_id, created_at, listing:listings(id, title, photos)')
          .in('id', missingOrderIds);
        (extraOrders || []).forEach((o: any) => orderMap.set(o.id, o));
      }

      const allOrders = Array.from(orderMap.values());
      const driverUserIds = rawAssignments.map((a) => a.delivery_person?.user_id).filter(Boolean);
      const orderUserIds = allOrders.flatMap((o: any) => [o.buyer_id, o.seller_id]).filter(Boolean);
      const mediatorUserIds = rawAssignments.map((a) => a.resolved_by).filter(Boolean);
      const allUserIds = [...new Set([...orderUserIds, ...driverUserIds, ...mediatorUserIds])];

      let userMap = new Map<string, any>();
      if (allUserIds.length > 0) {
        const { data: users } = await supabase
          .from('users_private')
          .select('id, full_name, phone')
          .in('id', allUserIds);
        userMap = new Map((users || []).map((u: any) => [u.id, u]));
      }

      const payoutByAssignmentId = new Map<string, PayoutItem>();
      rawPayouts.forEach((p: PayoutItem) => {
        if (p.delivery_assignment_id) {
          payoutByAssignmentId.set(p.delivery_assignment_id, p);
        }
      });

      const assignedOrderIds = new Set<string>();
      const mergedFromAssignments: AdminDeliveryItem[] = rawAssignments.map((a) => {
        if (a.order_id) assignedOrderIds.add(a.order_id);
        const order = orderMap.get(a.order_id) as any;
        const dp = a.delivery_person as any;
        const driverName = dp?.name || (dp?.user_id ? userMap.get(dp.user_id)?.full_name : null) || 'Inconnu';
        const driverPhone = dp?.phone || (dp?.user_id ? userMap.get(dp.user_id)?.phone : null) || null;

        return {
          ...a,
          delivery_person: dp ? { ...dp, name: driverName, phone: driverPhone } : null,
          mediator: a.resolved_by ? userMap.get(a.resolved_by) : null,
          driver_payout: payoutByAssignmentId.get(a.id) || null,
          order: order
            ? {
                ...order,
                buyer: userMap.get(order.buyer_id) ?? null,
                seller: userMap.get(order.seller_id) ?? null,
              }
            : null,
        };
      });

      // Inclure aussi les commandes qui n'ont pas encore de ligne dans delivery_assignments
      const orderOnlyItems: AdminDeliveryItem[] = allOrders
        .filter((o: any) => !assignedOrderIds.has(o.id))
        .map((o: any) => ({
          id: o.id,
          order_id: o.id,
          is_order_only: true,
          delivery_person_id: null,
          status: o.status,
          created_at: o.created_at,
          delivery_price: o.delivery_fee,
          dropoff_location: o.delivery_address,
          order: {
            ...o,
            buyer: userMap.get(o.buyer_id) ?? null,
            seller: userMap.get(o.seller_id) ?? null,
          },
        }));

      const combined = [...mergedFromAssignments, ...orderOnlyItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setDeliveries(combined);

      const urls: Record<string, string> = {};
      for (const item of mergedFromAssignments) {
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
          } catch {
            // Ignorer une photo introuvable sans bloquer la liste
          }
        }
      }
      setPhotoUrls(urls);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des commandes et livraisons');
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

  const handleCancelItem = async (item: AdminDeliveryItem) => {
    const label = item.order?.listing?.title || `#${(item.order_id || item.id).slice(0, 6)}`;
    const confirmed = await confirmDialog({
      title: 'Annuler cette commande ?',
      message: `La commande « ${label} » passera au statut Annulée.`,
      confirmLabel: 'Confirmer l’annulation',
    });
    if (!confirmed) return;

    setCancellingId(item.id);
    try {
      if (item.order_id) {
        const { error: ordErr } = await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', item.order_id);
        if (ordErr) throw ordErr;
      }
      if (!item.is_order_only) {
        const { error: assErr } = await (supabase as any)
          .from('delivery_assignments')
          .update({ status: 'cancelled' })
          .eq('id', item.id);
        if (assErr) throw assErr;
      }
      toast.success('Commande annulée');
      await fetchDeliveries();
    } catch (err: any) {
      toast.error(err.message || 'Impossible d’annuler cette commande');
    } finally {
      setCancellingId(null);
    }
  };

  const activeItems = deliveries.filter((d) => ACTIVE_STATUSES.includes(d.status));
  const deliveredItems = deliveries.filter((d) => DELIVERED_STATUSES.includes(d.status));
  const pickupItems = deliveries.filter((d) => !isDriverDelivery(d));
  const cancelledItems = deliveries.filter((d) => d.status === 'cancelled' || d.order?.status === 'cancelled');
  const disputedCount = deliveries.filter((d) => d.status === 'disputed').length;

  const deliveredVolume = deliveredItems.reduce(
    (sum, d) => sum + (Number(d.order?.total_amount) || Number(d.delivery_price) || 0),
    0
  );

  const filteredDeliveries = deliveries.filter((item) => {
    if (filter === 'active' && !ACTIVE_STATUSES.includes(item.status)) return false;
    if (filter === 'delivered' && !DELIVERED_STATUSES.includes(item.status)) return false;
    if (filter === 'pickup' && isDriverDelivery(item)) return false;
    if (filter === 'cancelled' && item.status !== 'cancelled' && item.order?.status !== 'cancelled') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = item.order?.listing?.title?.toLowerCase() || '';
      const buyerName = item.order?.buyer?.full_name?.toLowerCase() || '';
      const sellerName = item.order?.seller?.full_name?.toLowerCase() || '';
      const driverName = item.delivery_person?.name?.toLowerCase() || '';
      return (
        title.includes(q) ||
        buyerName.includes(q) ||
        sellerName.includes(q) ||
        driverName.includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.order_id && item.order_id.toLowerCase().includes(q))
      );
    }
    return true;
  });

  if (loading) return <AdminLoading />;
  if (error) return <ErrorState message={error} onRetry={fetchDeliveries} />;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Commandes & Livraisons"
        description="Suivi unifié des achats en ligne, retraits en boutique et courses livreurs."
        actions={
          <AdminButton icon={RefreshCw} size="sm" loading={refreshing} onClick={handleRefresh}>
            Actualiser
          </AdminButton>
        }
      />

      <AdminStatGrid>
        <AdminStatCard
          label="En cours"
          icon={Truck}
          tone="warning"
          active={filter === 'active'}
          value={activeItems.length}
          hint="Commandes ou courses actives"
          onClick={() => setFilter(filter === 'active' ? 'all' : 'active')}
        />
        <AdminStatCard
          label="Livrées & Terminées"
          icon={CheckCircle2}
          tone="success"
          active={filter === 'delivered'}
          value={deliveredItems.length}
          hint={`Volume : ${formatPrice(deliveredVolume)}`}
          onClick={() => setFilter(filter === 'delivered' ? 'all' : 'delivered')}
        />
        <AdminStatCard
          label="Retraits boutique"
          icon={Store}
          active={filter === 'pickup'}
          value={pickupItems.length}
          hint="Sans livreur"
          onClick={() => setFilter(filter === 'pickup' ? 'all' : 'pickup')}
        />
        <AdminStatCard
          label="Litiges ouverts"
          icon={ShieldAlert}
          tone={disputedCount > 0 ? 'danger' : 'neutral'}
          value={disputedCount}
          hint={disputedCount > 0 ? 'Arbitrer sur la page Litiges' : `${cancelledItems.length} annulée(s)`}
          onClick={disputedCount > 0 ? () => navigate('/admin/litiges') : () => setFilter('cancelled')}
        />
      </AdminStatGrid>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <AdminTabs<DeliveryTabFilter>
            value={filter}
            onChange={setFilter}
            tabs={[
              { key: 'all', label: 'Toutes', count: deliveries.length },
              { key: 'active', label: 'En cours', count: activeItems.length },
              { key: 'delivered', label: 'Livrées', count: deliveredItems.length },
              { key: 'pickup', label: 'Retraits boutique', count: pickupItems.length },
              { key: 'cancelled', label: 'Annulées', count: cancelledItems.length },
            ]}
          />
        </div>

        <div className="relative mb-4 w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Article, acheteur, vendeur, #ID..."
            className={`${adminInputClass} pl-9 h-9 text-xs`}
          />
        </div>
      </div>

      {filteredDeliveries.length === 0 ? (
        <AdminEmpty
          icon={Truck}
          title="Aucune commande ou course"
          description="Aucun élément ne correspond aux filtres sélectionnés."
        />
      ) : (
        <ul className="space-y-2">
          {filteredDeliveries.map((item) => (
            <DeliveryCard
              key={item.id}
              item={item}
              photoUrl={photoUrls[item.id]}
              cancellingId={cancellingId}
              onCancelItem={handleCancelItem}
            />
          ))}
        </ul>
      )}
    </div>
  );
};
