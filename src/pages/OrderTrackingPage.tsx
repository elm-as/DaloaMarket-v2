import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Package as PackageIcon, CheckCircle, Truck, MapPin,
  Phone, ShoppingBag, XCircle, User as UserIcon,
  AlertTriangle, Clock, MessageCircle, ChevronRight, Eye, EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatPrice, formatDate, cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorState } from '../components/ui/ErrorState';
import { DeliveryOtpInputSection } from '../components/delivery/DeliveryOtpInputSection';
import { OrderStatusTimeline } from '../components/delivery/OrderStatusTimeline';
import type { UserRole } from '../components/delivery/OrderStatusTimeline';
import { OrderTrackingHeader } from '../components/delivery/OrderTrackingHeader';
import { CancelledBanner } from '../components/delivery/CancelledBanner';
import { SellerSection } from '../components/delivery/SellerSection';
import { BuyerSection } from '../components/delivery/BuyerSection';
import type { Order, RpcResult } from '../types/order';
import toast from 'react-hot-toast';

/* ─────────────── TYPES ─────────────── */

interface ListingSummary {
  title: string;
  photos: string[];
}


export function getStatusInfo(order: Order): { label: string; color: string; bgColor: string; borderColor: string } {
  const delivery = Array.isArray(order.delivery_assignment) 
    ? order.delivery_assignment[0] 
    : (order.delivery_assignment as any);
  switch (order.status) {
    case 'paid':
      if (delivery?.status === 'pending_seller_confirmation') return { label: 'En attente du vendeur', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' };
      if (delivery?.status === 'awaiting_pickup') return { label: 'En attente d\'un livreur', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
      if (delivery?.status === 'accepted') return { label: 'Livreur en route', color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' };
      return { label: 'Payée', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
    case 'in_transit': return { label: 'En livraison', color: 'text-[var(--color-primary-700)]', bgColor: 'bg-[var(--color-primary-50)]', borderColor: 'border-[var(--color-primary-200)]' };
    case 'delivered': return { label: 'Livrée ✓', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' };
    case 'cancelled': return { label: 'Annulée', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    default: return { label: order.status, color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/* ─────────────── MAIN PAGE ─────────────── */

const OrderTrackingPage: React.FC = () => {
  usePageTitle('Suivi de commande');
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useSupabase();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId || !user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*, delivery_assignment:delivery_assignments(*)')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Commande introuvable');

      const orderData = data as unknown as Order;

      if (orderData.listing_id) {
        const { data: listingData } = await supabase
          .from('listings')
          .select('title, photos')
          .eq('id', orderData.listing_id)
          .single();

        if (listingData) {
          const listing = listingData as ListingSummary;
          orderData.listing_title = listing.title;
          orderData.listing_photos = listing.photos;
        }
      }

      const dpId = Array.isArray(orderData.delivery_assignment) 
        ? orderData.delivery_assignment[0]?.delivery_person_id 
        : (orderData.delivery_assignment as any)?.delivery_person_id;

      if (dpId) {
        const { data: dpData } = await supabase
          .from('delivery_persons_directory')
          .select('user_id, name, phone, current_location')
          .eq('id', dpId)
          .single();
        if (dpData) {
          orderData.delivery_person_id = dpData.user_id;
          orderData.delivery_person = { name: dpData.name, phone: dpData.phone };
          if (dpData.current_location) {
            let coords: { lat: number; lng: number } | null = null;
            if (typeof dpData.current_location === 'string') {
              try {
                coords = JSON.parse(dpData.current_location);
              } catch {
                const parts = dpData.current_location.split(',');
                if (parts.length === 2) {
                  coords = { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
                }
              }
            } else if (typeof dpData.current_location === 'object') {
              coords = dpData.current_location as any;
            }
            if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
              orderData.delivery_person_location = [coords.lat, coords.lng];
            }
          }
        }
      }

      // Fetch buyer info
      const { data: buyerData } = await supabase
        .from('users')
        .select('full_name, phone')
        .eq('id', orderData.buyer_id)
        .single();
      if (buyerData) {
        orderData.buyer_name = buyerData.full_name ?? undefined;
        orderData.buyer_phone = buyerData.phone ?? undefined;
      }

      // Fetch seller info
      const { data: sellerData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', orderData.seller_id)
        .single();
      if (sellerData) {
        orderData.seller_name = sellerData.full_name ?? undefined;
      }

      setOrder(orderData);
    } catch (err: unknown) {
      console.error('Error fetching order:', err);
      setError(getErrorMessage(err, 'Impossible de charger la commande.'));
    } finally {
      setLoading(false);
    }
  }, [orderId, user]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-changes-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        () => {
          fetchOrder();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_assignments',
          filter: `order_id=eq.${orderId}`,
        },
        () => {
          fetchOrder();
        }
      );

    const dpId = order?.delivery_assignment?.[0]?.delivery_person_id;
    if (dpId) {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_persons',
          filter: `id=eq.${dpId}`,
        },
        () => {
          fetchOrder();
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, fetchOrder, order?.delivery_assignment?.[0]?.delivery_person_id]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  /* ── Error ── */
  if (error || !order) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="px-4 py-3">
          <Button
            variant="text"
            color="primary"
            icon={<ArrowLeft className="w-5 h-5" />}
            onClick={() => navigate(-1)}
          >
            Retour
          </Button>
        </div>
        <ErrorState
          message={error || 'Commande introuvable'}
          onRetry={() => fetchOrder()}
        />
      </div>
    );
  }

  const isSeller = user?.id === order.seller_id;
  const isBuyer = user?.id === order.buyer_id;
  const isDeliveryPerson = order?.delivery_person_id === user?.id;
  const delivery = order.delivery_assignment?.[0];
  const isCancelledOrDisputed = order.status === 'cancelled' || delivery?.status === 'disputed';
  const hasMap = order.seller_lat != null && order.seller_lng != null;
  const productPhoto = order.listing_photos?.[0];
  const userRole: UserRole = isSeller ? 'seller' : isBuyer ? 'buyer' : isDeliveryPerson ? 'delivery' : 'other';

  return (
    <div className="w-full max-w-2xl mx-auto pb-12">
      {/* ── IMMERSIVE HEADER ── */}
      <OrderTrackingHeader order={order} />

      {/* ── CONTENT ── */}
      <div className={cn('px-4 space-y-4', hasMap ? 'pt-4' : '-mt-4 relative z-10')}>

        {/* ── CANCELLED / DISPUTED BANNER ── */}
        <CancelledBanner order={order} onBack={() => navigate('/mes-commandes')} />

        {/* ── PRODUCT SUMMARY ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className={cn(
            'bg-white rounded-2xl p-4 shadow-sm border border-gray-100',
            isCancelledOrDisputed && 'opacity-60',
          )}>
            <div className="flex items-start gap-3.5">
              {/* Product photo */}
              {productPhoto ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                  <img
                    src={productPhoto}
                    alt={order.listing_title || 'Produit'}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <PackageIcon className="w-7 h-7 text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-[16px] font-bold text-gray-900 leading-snug truncate">
                  {order.listing_title || 'Commande'}
                </h2>
                <p className="text-[12px] text-gray-400 mt-0.5 font-medium">
                  N° {order.id.slice(0, 8).toUpperCase()} · {formatDate(order.created_at)}
                </p>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="mt-4 pt-3.5 border-t border-gray-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gray-500">Produit</span>
                <span className="text-[13px] font-medium text-gray-700">{formatPrice(order.product_amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gray-500">Livraison</span>
                <span className="text-[13px] font-medium text-gray-700">{formatPrice(order.delivery_fee)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-200">
                <span className="text-[14px] font-bold text-gray-900">Total</span>
                <span className="text-[18px] font-black text-gray-900">{formatPrice(order.total_amount)}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── ROLE SECTIONS ── */}
        {!isCancelledOrDisputed && (
          <>
            {isSeller && <SellerSection order={order} onChanged={fetchOrder} />}
            {isBuyer && <BuyerSection order={order} onChanged={fetchOrder} />}
            {(isDeliveryPerson || (isSeller && order.delivery_mode === 'pickup')) && order.delivery_assignment?.[0] && (
              <DeliveryOtpInputSection order={order} onSuccess={fetchOrder} />
            )}
          </>
        )}

        {/* ── TIMELINE ── */}
        {!isCancelledOrDisputed && (
          <OrderStatusTimeline order={order} role={userRole} />
        )}

        {/* ── DELIVERY INFO ── */}
        {!isCancelledOrDisputed && (order.delivery_person?.name || order.delivery_person?.phone || (order.delivery_address && (isBuyer || isDeliveryPerson))) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="text-[15px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
                Infos de livraison
              </h3>
              <div className="space-y-3">
                {order.delivery_person?.name && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-primary-50)] flex items-center justify-center flex-shrink-0">
                      <Truck className="w-5 h-5 text-[var(--color-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">Livreur</p>
                      <p className="text-[14px] font-semibold text-gray-900">{order.delivery_person.name}</p>
                    </div>
                    {order.delivery_person.phone && (
                      <a
                        href={`tel:${order.delivery_person.phone}`}
                        className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform shadow-md shadow-[var(--color-primary)]/25"
                      >
                        <Phone className="w-4 h-4 text-white" />
                      </a>
                    )}
                  </div>
                )}
                {(isBuyer || isDeliveryPerson) && order.delivery_address && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">Adresse de livraison</p>
                      <p className="text-[14px] font-medium text-gray-900">{order.delivery_address}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                )}
                {isSeller && (
                  <p className="text-[11px] text-gray-400 italic px-1">
                    L'adresse de livraison n'est visible que par le livreur et l'acheteur.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingPage;
