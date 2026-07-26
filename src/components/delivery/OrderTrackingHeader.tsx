import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Truck, XCircle } from 'lucide-react';
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
  const delivery = order.delivery_assignment?.[0];
  const isCancelledOrDisputed = order.status === 'cancelled' || delivery?.status === 'disputed';
  const hasMap = order.seller_lat != null && order.seller_lng != null;

  if (hasMap) {
    return (
      <div className="relative">
        <DaloaMap
          sellerPosition={[order.seller_lat!, order.seller_lng!]}
          buyerPosition={(order.delivery_lat != null && order.delivery_lng != null) ? [order.delivery_lat, order.delivery_lng] : undefined}
          deliveryPersonPosition={order.delivery_person_location || undefined}
          height="240px"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />
        {/* Back button on map */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-3 left-3 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </button>
        {/* Status badge on map */}
        <div className="absolute bottom-3 left-3 right-3 z-10">
          <div className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border shadow-lg',
            statusInfo.bgColor + '/90', statusInfo.borderColor,
          )}>
            <div className={cn(
              'w-2 h-2 rounded-full',
              order.status === 'delivered' ? 'bg-emerald-500' :
              isCancelledOrDisputed ? 'bg-red-500' :
              'bg-[var(--color-primary)] animate-pulse',
            )} />
            <span className={cn('text-[13px] font-bold', statusInfo.color)}>
              {statusInfo.label}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary-400)] to-[var(--color-secondary)] px-4 pt-4 pb-10">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

      <div className="relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-transform border border-white/10 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            {isCancelledOrDisputed
              ? <XCircle className="w-6 h-6 text-white" />
              : order.status === 'delivered'
                ? <CheckCircle className="w-6 h-6 text-white" />
                : <Truck className="w-6 h-6 text-white" />
            }
          </div>
          <div>
            <h1 className="text-white font-bold text-[20px] leading-tight">Suivi de commande</h1>
            <div className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mt-1.5 text-[12px] font-bold',
              'bg-white/20 backdrop-blur-sm text-white',
            )}>
              <div className={cn(
                'w-1.5 h-1.5 rounded-full',
                isCancelledOrDisputed ? 'bg-red-300' :
                order.status === 'delivered' ? 'bg-emerald-300' :
                'bg-white animate-pulse',
              )} />
              {statusInfo.label}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
