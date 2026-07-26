import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, XCircle, MessageCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Order } from '../../types/order';

export const CancelledBanner: React.FC<{ order: Order; onBack: () => void }> = ({ order, onBack }) => {
  const isDisputed = order.delivery_assignment?.[0]?.status === 'disputed';
  const isCancelled = order.status === 'cancelled';

  if (!isCancelled && !isDisputed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'rounded-2xl p-5 border',
        isDisputed
          ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
          : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200',
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
          isDisputed ? 'bg-amber-100' : 'bg-red-100',
        )}>
          {isDisputed
            ? <AlertTriangle className="w-6 h-6 text-amber-600" />
            : <XCircle className="w-6 h-6 text-red-500" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            'text-[16px] font-bold',
            isDisputed ? 'text-amber-800' : 'text-red-800',
          )}>
            {isDisputed ? 'Litige en cours' : 'Commande annulée'}
          </h3>
          <p className={cn(
            'text-[13px] mt-1 leading-relaxed',
            isDisputed ? 'text-amber-700' : 'text-red-600',
          )}>
            {isDisputed
              ? 'Un problème a été signalé sur cette livraison. Notre équipe examine la situation et vous notifiera de la résolution.'
              : order.delivery_assignment?.[0]?.status === 'cancelled' && (order as any).cancel_reason === 'buyer'
                ? 'Vous avez annulé cette commande. Le remboursement du produit (hors frais de service) est en cours.'
                : order.delivery_assignment?.[0]?.pickup_confirmed_by_seller 
                  ? 'L\'acheteur n\'a pas communiqué le code OTP au livreur. Le livreur est rémunéré pour son déplacement. L\'acheteur sera remboursé du produit (hors frais de service).'
                  : 'Le vendeur n\'a pas confirmé la disponibilité de l\'article. (Si vous avez été débité, le remboursement sera traité automatiquement.)'}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={onBack}
              className={cn(
                'h-10 px-5 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97]',
                isDisputed
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  : 'bg-red-100 text-red-700 hover:bg-red-200',
              )}
            >
              Retour aux commandes
            </button>
            <button
              onClick={() => { window.open('https://wa.me/2250700000000', '_blank'); }}
              className={cn(
                'h-10 px-5 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97] flex items-center gap-1.5',
                isDisputed
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-red-600 text-white hover:bg-red-700',
              )}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Contacter le support
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
