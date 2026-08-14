import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Truck, XCircle, Store, ShoppingBag } from 'lucide-react';
import { cn } from '../../lib/utils';
import DaloaMap from '../maps/DaloaMap';
import { getStatusInfo } from '../../pages/OrderTrackingPage';
import type { Order } from '../../types/order';

interface OrderTrackingHeaderProps {
  order: Order;
}

export const OrderTrackingHeader: React.FC<OrderTrackingHeaderProps> = ({ order }) => {
  const navigate = useNavigate();
  const statusInfo = getStatusInfo(order);
  const isPickup = order.delivery_mode === 'pickup' || order.delivery_mode === 'pickup_point';
  const isCashAtShop = order.payment_method === 'cash_at_shop';
  const delivery = order.delivery_assignment?.[0];
  const isCancelledOrDisputed = order.status === 'cancelled' || delivery?.status === 'disputed';
  const hasMap = order.seller_lat != null && order.seller_lng != null;

  if (hasMap) {
    return (
      <div className="relative">
        <DaloaMap
          sellerPosition={[order.seller_lat!, order.seller_lng!]}
          buyerPosition={(!isPickup && order.delivery_lat != null && order.delivery_lng != null) ? [order.delivery_lat, order.delivery_lng] : undefined}
          deliveryPersonPosition={!isPickup ? (order.delivery_person_location || undefined) : undefined}
          height="200px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
        
        <button
          onClick={() => navigate(-1)}
          className="absolute top-3 left-3 z-10 w-9 h-9 rounded-xl bg-white/90 backdrop-blur-md shadow-sm flex items-center justify-center text-gray-800 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between">
          <div className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-bold shadow-sm',
            statusInfo.bgColor + '/95', statusInfo.borderColor, statusInfo.color
          )}>
            <div className={cn(
              'w-2 h-2 rounded-full',
              order.status === 'delivered' || order.status === 'completed' ? 'bg-emerald-500' :
              isCancelledOrDisputed ? 'bg-red-500' :
              'bg-[var(--color-primary)] animate-pulse',
            )} />
            <span>{statusInfo.label}</span>
          </div>

          <span className="text-[11px] font-mono font-bold text-white/90 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-gray-100 px-4 pt-3.5 pb-4">
      <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200/80 flex items-center justify-center text-gray-700 active:scale-95 transition-all flex-shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-extrabold text-gray-900 leading-tight truncate">
                {isCashAtShop
                  ? 'Réservation Boutique'
                  : isPickup
                  ? 'Retrait Boutique'
                  : 'Suivi Livraison'}
              </h1>
            </div>
            <p className="text-[11px] font-mono font-semibold text-gray-400">
              Commande #{order.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        <div className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border flex-shrink-0 shadow-2xs',
          statusInfo.bgColor, statusInfo.borderColor, statusInfo.color
        )}>
          <div className={cn(
            'w-1.5 h-1.5 rounded-full',
            isCancelledOrDisputed ? 'bg-red-500' :
            order.status === 'delivered' || order.status === 'completed' ? 'bg-emerald-500' :
            'bg-orange-500 animate-pulse',
          )} />
          <span>{statusInfo.label}</span>
        </div>
      </div>
    </div>
  );
};
