import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Truck, AlertTriangle, CheckCircle2, XCircle, Search, Clock, MapPin, User, ExternalLink, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { cn, formatDate } from '../../lib/utils';

type DeliveryTabFilter = 'all' | 'disputed' | 'active' | 'delivered';

export const AdminDeliveriesTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [filter, setFilter] = useState<DeliveryTabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const fetchDeliveries = useCallback(async () => {
    setError(null);
    try {
      // 1. Fetch assignments
      const { data: rawAssignments, error: err } = await (supabase as any)
        .from('delivery_assignments')
        .select('*, delivery_person:delivery_persons(*)')
        .order('created_at', { ascending: false });

      if (err) throw err;
      if (!rawAssignments || rawAssignments.length === 0) {
        setDeliveries([]);
        return;
      }

      // 2. Fetch associated orders
      const orderIds = [...new Set(((rawAssignments as any[]) || []).map((a) => a.order_id).filter(Boolean))];
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status, product_amount, delivery_fee, total_amount, delivery_address, buyer_id, seller_id')
        .in('id', orderIds);

      const orderMap = new Map((orders || []).map((o: any) => [o.id, o]));

      // 3. Fetch names + phones of buyers, sellers, drivers, and mediators
      const driverUserIds = [...new Set(((rawAssignments as any[]) || []).map((a) => a.delivery_person?.user_id).filter(Boolean))];
      const orderUserIds = [...new Set((orders || []).flatMap((o: any) => [o.buyer_id, o.seller_id]).filter(Boolean))];
      const mediatorUserIds = [...new Set(((rawAssignments as any[]) || []).map((a) => a.resolved_by).filter(Boolean))];
      const allUserIds = [...new Set([...orderUserIds, ...driverUserIds, ...mediatorUserIds])];

      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, phone')
        .in('id', allUserIds);

      const userMap = new Map((users || []).map((u: any) => [u.id, u]));

      // Merge data
      const merged = ((rawAssignments as any[]) || []).map((a) => {
        const order = orderMap.get(a.order_id) as any;
        const dp = a.delivery_person as any;
        const driverName = dp?.name || (dp?.user_id ? userMap.get(dp.user_id)?.full_name : null) || 'Inconnu';
        const driverPhone = dp?.phone || (dp?.user_id ? userMap.get(dp.user_id)?.phone : null) || null;
        const mediator = a.resolved_by ? userMap.get(a.resolved_by) : null;
        return {
          ...a,
          delivery_person: dp ? { ...dp, name: driverName, phone: driverPhone } : null,
          mediator: mediator,
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

      // Generate signed URLs for delivery photos
      const urls: Record<string, string> = {};
      for (const item of merged) {
        if (item.delivery_photo_url) {
          try {
            // Extract relative path
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
            console.error('Error signing URL:', e);
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

  const handleResolveDispute = async (assignmentId: string, action: 'deliver' | 'cancel' | 'refund_complete' | 'refund_partial') => {
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
      toast.error(err.message || 'Erreur lors de la résolution');
    } finally {
      setProcessing(null);
    }
  };

  // Filter & Search deliveries
  const filteredDeliveries = deliveries.filter((item) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'disputed'
        ? item.status === 'disputed'
        : filter === 'delivered'
        ? item.status === 'delivered'
        : ['pending_seller_confirmation', 'awaiting_pickup', 'accepted', 'picked_up', 'in_transit'].includes(item.status);

    const buyerName = item.order?.buyer?.full_name?.toLowerCase() || '';
    const sellerName = item.order?.seller?.full_name?.toLowerCase() || '';
    const driverName = item.delivery_person?.name?.toLowerCase() || '';
    const idStr = item.id.toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      buyerName.includes(query) ||
      sellerName.includes(query) ||
      driverName.includes(query) ||
      idStr.includes(query);

    return matchesFilter && matchesSearch;
  });

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
          <h2 className="text-xl font-bold text-[var(--color-on-surface)]">Suivi des Livraisons & Litiges</h2>
          <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">
            Gérez les courses actives, vérifiez les photos de livraison et tranchez les litiges en cours.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="self-start sm:self-center flex items-center gap-1.5 px-3 py-2 bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)] rounded-xl text-xs font-semibold hover:bg-[var(--color-outline-variant)] active:scale-95 transition-all"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          Actualiser
        </button>
      </div>

      {/* Tabs / Filters */}
      <div className="flex gap-2 border-b border-[var(--color-outline)] pb-px overflow-x-auto min-w-max">
        {(['all', 'disputed', 'active', 'delivered'] as const).map((key) => {
          const count =
            key === 'disputed'
              ? deliveries.filter((d) => d.status === 'disputed').length
              : key === 'active'
              ? deliveries.filter((d) => ['pending_seller_confirmation', 'awaiting_pickup', 'accepted', 'picked_up', 'in_transit'].includes(d.status)).length
              : key === 'delivered'
              ? deliveries.filter((d) => d.status === 'delivered').length
              : deliveries.length;

          const label = key === 'all' ? 'Toutes' : key === 'disputed' ? 'Litiges' : key === 'active' ? 'En cours' : 'Livrées';
          const isActive = filter === key;

          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-xs sm:text-sm font-semibold transition-all border-b-2 relative -bottom-[2px]',
                isActive
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-bold'
                  : 'border-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
              )}
            >
              {label}
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  key === 'disputed' && count > 0
                    ? 'bg-red-100 text-red-700'
                    : 'bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-on-surface-variant)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par acheteur, vendeur, livreur ou ID de course..."
          className="w-full pl-11 pr-4 py-3 bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </div>

      {/* Deliveries List */}
      {filteredDeliveries.length === 0 ? (
        <EmptyState title="Aucune course correspondante" icon={<Truck size={48} />} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDeliveries.map((item) => {
            const isDisputed = item.status === 'disputed';
            const isProcessing = processing === item.id;
            const buyer = item.order?.buyer;
            const seller = item.order?.seller;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'bg-white border rounded-2xl p-5 shadow-sm space-y-4 transition-all relative overflow-hidden',
                  isDisputed ? 'border-red-200 shadow-red-50/50 shadow-md' : 'border-gray-100'
                )}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 tracking-wide uppercase">ID Course</span>
                    <h3 className="font-bold text-gray-900 text-sm">#{item.id.slice(0, 8)}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider',
                      item.status === 'delivered'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isDisputed
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : item.status === 'cancelled'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    )}
                  >
                    {item.status === 'disputed' ? 'LITIGE' : item.status}
                  </span>
                </div>

                {/* Actors Block */}
                <div className="bg-gray-50 rounded-xl p-3.5 space-y-2 text-xs border border-gray-100/50">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-semibold uppercase tracking-wider text-[9px]">Acheteur</span>
                    <span className="font-bold text-gray-800">
                      {buyer?.full_name || 'Inconnu'} {buyer?.phone && <span className="text-gray-400 font-normal">({buyer.phone})</span>}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-semibold uppercase tracking-wider text-[9px]">Vendeur</span>
                    <span className="font-bold text-gray-800">
                      {seller?.full_name || 'Inconnu'} {seller?.phone && <span className="text-gray-400 font-normal">({seller.phone})</span>}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-semibold uppercase tracking-wider text-[9px]">Livreur</span>
                    <span className="font-bold text-gray-800">
                      {item.delivery_person?.name || 'Non assigné'} {item.delivery_person?.phone && <span className="text-gray-400 font-normal">({item.delivery_person.phone})</span>}
                    </span>
                  </div>
                </div>

                {/* Trajectory */}
                <div className="space-y-1.5 text-xs text-gray-700">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                    <span>
                      <strong className="text-gray-500">De :</strong> {item.pickup_location || 'Adresse du vendeur'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500 mt-0.5" />
                    <span>
                      <strong className="text-gray-500">À :</strong> {item.dropoff_location || 'Adresse de livraison'}
                    </span>
                  </div>
                </div>

                {/* Dispute Reason */}
                {item.dispute_reason && (
                  <div className="p-3.5 bg-red-50 text-red-800 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] uppercase tracking-wider opacity-75 font-bold">Motif du litige</p>
                      <p className="font-semibold mt-0.5 leading-relaxed">{item.dispute_reason}</p>
                    </div>
                  </div>
                )}

                {/* Dispute Mediator */}
                {item.resolved_by && (
                  <div className="p-3 bg-gray-50 text-gray-600 rounded-xl flex items-start gap-2 text-xs border border-gray-100/80">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] uppercase tracking-wider opacity-75 font-bold">Résolution Litige</p>
                      <p className="font-bold mt-0.5 text-gray-800">
                        Médiateur : {item.mediator?.full_name || 'Admin'}
                      </p>
                      {item.resolved_at && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Le {new Date(item.resolved_at).toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Delivery Photo Verification */}
                {item.delivery_photo_url && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Preuve de livraison</p>
                    {photoUrls[item.id] ? (
                      <div className="relative rounded-xl overflow-hidden border border-gray-100 shadow-sm group">
                        <img
                          src={photoUrls[item.id]}
                          alt="Preuve livraison"
                          className="w-full h-36 object-cover cursor-pointer hover:scale-102 transition-transform duration-300"
                          onClick={() => window.open(photoUrls[item.id], '_blank')}
                        />
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white p-1.5 rounded-lg opacity-85 pointer-events-none">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Chargement de la photo...</p>
                    )}
                  </div>
                )}

                {/* Dispute Actions */}
                {isDisputed && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-wider">Décision de Médiation</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolveDispute(item.id, 'refund_complete')}
                        disabled={isProcessing}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold active:scale-[0.97] transition-all disabled:opacity-50"
                      >
                        Remb. 100% Acheteur
                      </button>
                      <button
                        onClick={() => handleResolveDispute(item.id, 'refund_partial')}
                        disabled={isProcessing}
                        className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold active:scale-[0.97] transition-all disabled:opacity-50"
                      >
                        Remb. Produit Uniquement
                      </button>
                    </div>
                    <button
                      onClick={() => handleResolveDispute(item.id, 'deliver')}
                      disabled={isProcessing}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Forcer Livraison (payer vendeur & livreur)
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
