import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, XCircle, MessageCircle, Store, Truck, RotateCcw, ArrowLeft, ShoppingBag, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../../hooks/useSupabase';
import { cn, formatPrice } from '../../lib/utils';
import type { Order } from '../../types/order';

interface CancelledBannerProps {
  order: Order;
  onBack: () => void;
}

export const CancelledBanner: React.FC<CancelledBannerProps> = ({ order, onBack }) => {
  const navigate = useNavigate();
  const { user } = useSupabase();

  const delivery = Array.isArray(order.delivery_assignment)
    ? order.delivery_assignment[0]
    : (order.delivery_assignment as any);

  const isDisputed = delivery?.status === 'disputed' || order.status === 'disputed';
  const isCancelled = order.status === 'cancelled';

  if (!isCancelled && !isDisputed) return null;

  const isSeller = user?.id === order.seller_id;
  const isBuyer = user?.id === order.buyer_id;

  const isPickup = order.delivery_mode === 'pickup' || order.delivery_mode === 'pickup_point';
  const isCashAtShop = order.payment_method === 'cash_at_shop';
  const isCod = order.payment_method === 'cod';
  const isOnlinePaid = !isCashAtShop && !isCod;
  const cancelReason = (order as any).cancel_reason;
  const isSellerUnavailable = cancelReason === 'unavailable' || cancelReason === 'seller_unavailable';

  // Config contextuelle, sobre et épurée selon que l'on est acheteur ou vendeur
  let title = 'Commande annulée';
  let message = 'Cette commande a été annulée.';
  let badgeLabel = 'Annulée';
  let icon = <XCircle className="w-5 h-5 text-red-500" />;
  let iconBg = 'bg-red-50 text-red-600 border-red-100';
  let cardBg = 'bg-white border-red-100 shadow-xs';
  let isDisputeMode = false;

  if (isDisputed) {
    isDisputeMode = true;
    title = 'Litige en cours';
    message = isSeller
      ? 'Un problème a été signalé sur cette vente. L\'équipe d\'administration examine le dossier.'
      : 'Un problème a été signalé sur votre livraison. L\'équipe d\'administration examine le dossier.';
    badgeLabel = 'Médiation';
    icon = <AlertTriangle className="w-5 h-5 text-amber-600" />;
    iconBg = 'bg-amber-50 text-amber-600 border-amber-100';
    cardBg = 'bg-white border-amber-200 shadow-xs';
  } else if (isCashAtShop) {
    // 1. Cash boutique
    if (isSeller) {
      title = 'Réservation annulée par le client';
      message = 'L\'acheteur a annulé sa réservation en boutique. L\'article a été automatiquement remis en stock.';
      badgeLabel = 'Réservation annulée';
    } else {
      title = 'Réservation annulée';
      message = 'Votre réservation a bien été annulée. Aucun prélèvement n\'a été effectué.';
      badgeLabel = 'Sans frais';
    }
    icon = <Store className="w-5 h-5 text-gray-500" />;
    iconBg = 'bg-gray-100 text-gray-600 border-gray-200';
    cardBg = 'bg-white border-gray-200 shadow-xs';
  } else if (isCod) {
    // 2. Paiement à la livraison
    if (isSeller) {
      title = 'Commande annulée par le client';
      message = 'L\'acheteur a annulé sa commande avec paiement à la livraison. L\'article est remis en vente.';
      badgeLabel = 'Commande annulée';
    } else {
      title = 'Commande annulée';
      message = 'La commande a été annulée avant l\'envoi du coursier. Aucun paiement n\'a été débité.';
      badgeLabel = 'Sans frais';
    }
    icon = <Truck className="w-5 h-5 text-blue-600" />;
    iconBg = 'bg-blue-50 text-blue-600 border-blue-100';
    cardBg = 'bg-white border-blue-100 shadow-xs';
  } else if (isOnlinePaid) {
    // 3. Payé en ligne
    if (isSeller) {
      if (isSellerUnavailable) {
        title = 'Commande annulée (Indisponibilité)';
        message = 'Vous avez annulé cette commande car l\'article n\'est plus disponible. L\'acheteur a été remboursé.';
        badgeLabel = 'Indisponible';
      } else {
        title = 'Commande annulée par l\'acheteur';
        message = 'L\'acheteur a annulé sa commande avant l\'expédition. L\'acheteur a été remboursé et l\'article a été remis en stock.';
        badgeLabel = 'Remboursé au client';
      }
    } else {
      if (isSellerUnavailable) {
        title = 'Article indisponible chez le vendeur';
        message = `Le vendeur ne peut pas honorer la commande. Le remboursement intégral de ${formatPrice(order.total_amount)} est en cours vers votre compte Mobile Money.`;
      } else {
        title = isPickup ? 'Réservation annulée' : 'Commande annulée';
        message = `Remboursement intégral de ${formatPrice(order.total_amount)} en cours vers votre compte Mobile Money.`;
      }
      badgeLabel = 'Remboursement';
    }
    icon = <RotateCcw className="w-5 h-5 text-emerald-600" />;
    iconBg = 'bg-emerald-50 text-emerald-600 border-emerald-100';
    cardBg = 'bg-white border-emerald-100 shadow-xs';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('rounded-2xl p-4 border', cardBg)}
    >
      <div className="flex items-start gap-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border', iconBg)}>
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[14px] font-bold text-gray-900 leading-tight">
              {title}
            </h3>
            <span className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border',
              isDisputeMode
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : isOnlinePaid
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-50 text-gray-600 border-gray-200'
            )}>
              {badgeLabel}
            </span>
          </div>

          <p className="text-[12px] text-gray-600 mt-1 leading-snug">
            {message}
          </p>

          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
            <button
              onClick={onBack}
              className="text-[12px] font-bold text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 active:scale-95 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Mes commandes
            </button>

            <button
              onClick={() => window.open('https://wa.me/2250700000000', '_blank')}
              className="text-[12px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              Aide WhatsApp
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
