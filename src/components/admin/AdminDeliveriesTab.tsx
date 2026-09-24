import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Search, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ErrorState } from '../ui/ErrorState';
import { DeliveryCard } from './deliveries/DeliveryCard';
import type { AdminDeliveryItem, DeliveryTabFilter } from './deliveries/types';
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

export const AdminDeliveriesTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<AdminDeliveryItem[]>([]);
  const [filter, setFilter] = useState<DeliveryTabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const navigate = useNavigate();

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
        .select('id, status, product_amount, delivery_fee, total_amount, delivery_mode, payment_method, delivery_address, buyer_id, seller_id')
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

  const ACTIVE = ['pending_seller_confirmation', 'awaiting_pickup', 'accepted', 'picked_up', 'in_transit'];

  const filteredDeliveries = deliveries.filter((item) => {
    if (filter === 'active' && !ACTIVE.includes(item.status)) return false;
    if (filter === 'delivered' && item.status !== 'delivered') return false;
    if (filter === 'cancelled' && item.status !== 'cancelled') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const buyerName = item.order?.buyer?.full_name?.toLowerCase() || '';
      const sellerName = item.order?.seller?.full_name?.toLowerCase() || '';
      const driverName = item.delivery_person?.name?.toLowerCase() || '';
      return buyerName.includes(q) || sellerName.includes(q) || driverName.includes(q) || item.id.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return <AdminLoading />;
  if (error) return <ErrorState message={error} onRetry={fetchDeliveries} />;

  const disputedCount = deliveries.filter((d) => d.status === 'disputed').length;

  return (
    <div>
      <AdminPageHeader
        title="Livraisons"
        description="Suivi des courses. Les litiges et les versements livreurs se traitent sur leurs propres pages."
        actions={
          <AdminButton icon={RefreshCw} loading={refreshing} onClick={handleRefresh}>
            Actualiser
          </AdminButton>
        }
      />

      <AdminStatGrid>
        <AdminStatCard label="En cours" icon={Truck} value={deliveries.filter((d) => ACTIVE.includes(d.status)).length} />
        <AdminStatCard label="Livrées" tone="success" value={deliveries.filter((d) => d.status === 'delivered').length} />
        <AdminStatCard
          label="Litiges"
          tone={disputedCount > 0 ? 'danger' : 'neutral'}
          value={disputedCount}
          hint={disputedCount > 0 ? 'Voir la page Litiges' : undefined}
          onClick={disputedCount > 0 ? () => navigate('/admin/litiges') : undefined}
        />
        <AdminStatCard label="Annulées" value={deliveries.filter((d) => d.status === 'cancelled').length} />
      </AdminStatGrid>

      <AdminTabs<DeliveryTabFilter>
        value={filter}
        onChange={setFilter}
        tabs={[
          { key: 'all', label: 'Toutes', count: deliveries.length },
          { key: 'active', label: 'En cours', count: deliveries.filter((d) => ACTIVE.includes(d.status)).length },
          { key: 'delivered', label: 'Livrées' },
          { key: 'cancelled', label: 'Annulées' },
        ]}
      />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Acheteur, vendeur, livreur ou numéro de course"
          className={`${adminInputClass} pl-9`}
        />
      </div>

      {filteredDeliveries.length === 0 ? (
        <AdminEmpty icon={Truck} title="Aucune course" description="Aucune course ne correspond à ces critères." />
      ) : (
        <ul className="space-y-2">
          {filteredDeliveries.map((item) => (
            <DeliveryCard key={item.id} item={item} photoUrl={photoUrls[item.id]} />
          ))}
        </ul>
      )}
    </div>
  );
};
