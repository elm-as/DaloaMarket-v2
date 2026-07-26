import React from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, Package as PackageIcon, Truck, ClipboardCheck } from 'lucide-react';
import { cn, formatDate } from '../../lib/utils';
import type { Order } from '../../types/order';
export type UserRole = 'seller' | 'buyer' | 'delivery' | 'other';

type TimelineStep = 'confirmed' | 'seller_confirmed' | 'picked_up' | 'in_transit' | 'delivered';

interface StepDef {
  key: TimelineStep;
  icon: React.ReactNode;
  labels: Record<UserRole, { label: string; description: string }>;
}

const TIMELINE_STEPS: StepDef[] = [
  {
    key: 'confirmed',
    icon: <Shield className="w-4 h-4" />,
    labels: {
      buyer:    { label: 'Commande confirmée',  description: 'Votre paiement est sécurisé en séquestre.' },
      seller:   { label: 'Commande reçue',      description: 'L\'acheteur a payé. Le paiement est sécurisé en séquestre.' },
      delivery: { label: 'Commande confirmée',  description: 'Le paiement est sécurisé en séquestre.' },
      other:    { label: 'Commande confirmée',  description: 'Le paiement est sécurisé en séquestre.' },
    },
  },
  {
    key: 'seller_confirmed',
    icon: <ClipboardCheck className="w-4 h-4" />,
    labels: {
      buyer:    { label: 'Vendeur prêt',           description: 'Le vendeur a confirmé la disponibilité du produit.' },
      seller:   { label: 'Confirmation requise',    description: 'Confirmez la disponibilité du produit.' },
      delivery: { label: 'Vendeur prêt',            description: 'Le vendeur a confirmé la disponibilité.' },
      other:    { label: 'Vendeur prêt',            description: 'Le vendeur a confirmé la disponibilité du produit.' },
    },
  },
  {
    key: 'picked_up',
    icon: <PackageIcon className="w-4 h-4" />,
    labels: {
      buyer:    { label: 'Colis récupéré',     description: 'Le livreur a récupéré le colis chez le vendeur.' },
      seller:   { label: 'Colis récupéré',     description: 'Le livreur a récupéré le colis.' },
      delivery: { label: 'Colis récupéré',     description: 'Vous avez récupéré le colis chez le vendeur.' },
      other:    { label: 'Colis récupéré',     description: 'Le livreur a récupéré le colis chez le vendeur.' },
    },
  },
  {
    key: 'in_transit',
    icon: <Truck className="w-4 h-4" />,
    labels: {
      buyer:    { label: 'En livraison',       description: 'Le livreur est en route vers vous.' },
      seller:   { label: 'En livraison',       description: 'Le livreur est en route vers l\'acheteur.' },
      delivery: { label: 'En livraison',       description: 'Vous êtes en route vers le point de livraison.' },
      other:    { label: 'En livraison',       description: 'Le livreur est en route vers le point de livraison.' },
    },
  },
  {
    key: 'delivered',
    icon: <CheckCircle className="w-4 h-4" />,
    labels: {
      buyer:    { label: 'Livré',              description: 'Votre colis a été livré avec succès !' },
      seller:   { label: 'Livré',              description: 'Le colis a été livré à l\'acheteur !' },
      delivery: { label: 'Livré',              description: 'Vous avez livré le colis avec succès !' },
      other:    { label: 'Livré',              description: 'Le colis a été livré avec succès !' },
    },
  },
];

const ORDER_STATUS_ORDER: TimelineStep[] = ['confirmed', 'seller_confirmed', 'picked_up', 'in_transit', 'delivered'];

function isStepCompleted(step: TimelineStep, order: Order): boolean {
  const delivery = Array.isArray(order.delivery_assignment) 
    ? order.delivery_assignment[0] 
    : (order.delivery_assignment as any);
  switch (step) {
    case 'confirmed': return true; // L'order n'existe que si le paiement est confirmé
    case 'seller_confirmed': return delivery?.status !== 'pending_seller_confirmation' && !!delivery?.pickup_confirmed_by_seller;
    case 'picked_up': return delivery?.status === 'in_transit' || delivery?.status === 'delivered' || order.status === 'in_transit' || order.status === 'delivered';
    case 'in_transit': return order.status === 'in_transit' || order.status === 'delivered';
    case 'delivered': return order.status === 'delivered';
    default: return false;
  }
}

function getStepStatus(step: TimelineStep, order: Order): 'completed' | 'current' | 'pending' {
  const lastCompletedIndex = ORDER_STATUS_ORDER.reduce((lastIndex, currentStep, index) => {
    return isStepCompleted(currentStep, order) ? index : lastIndex;
  }, -1);

  const stepIndex = ORDER_STATUS_ORDER.indexOf(step);
  if (stepIndex <= lastCompletedIndex) return 'completed';
  if (stepIndex === lastCompletedIndex + 1) return 'current';
  return 'pending';
}

function getStepDate(step: TimelineStep, order: Order): string | null {
  const delivery = Array.isArray(order.delivery_assignment) 
    ? order.delivery_assignment[0] 
    : (order.delivery_assignment as any);
  switch (step) {
    case 'confirmed': return order.created_at;
    case 'seller_confirmed': return delivery?.pickup_confirmed_at || null;
    case 'delivered': return delivery?.delivered_at || null;
    default: return null;
  }
}

interface OrderStatusTimelineProps {
  order: Order;
  role: UserRole;
}

export const OrderStatusTimeline: React.FC<OrderStatusTimelineProps> = ({ order, role }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
    >
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-[15px] font-bold text-gray-900 mb-5">Progression</h3>

        <div className="space-y-0">
          {TIMELINE_STEPS.map((step, index) => {
            const status = getStepStatus(step.key, order);
            const isLast = index === TIMELINE_STEPS.length - 1;
            const stepDate = getStepDate(step.key, order);
            const { label, description } = step.labels[role];

            return (
              <div key={step.key} className="flex items-stretch">
                {/* Connector */}
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: status === 'current' ? 1 : 1,
                      backgroundColor: status === 'completed' ? '#10B981' : status === 'current' ? 'var(--color-primary)' : '#F3F4F6',
                      borderColor: status === 'completed' ? '#10B981' : status === 'current' ? 'var(--color-primary)' : '#D1D5DB',
                    }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center border-2 relative',
                    )}
                  >
                    {status === 'current' && (
                      <div className="absolute inset-0 rounded-full bg-[var(--color-primary)]/20 animate-ping" />
                    )}
                    <span className={cn(
                      'relative z-10',
                      (status === 'completed' || status === 'current') ? 'text-white' : 'text-gray-400',
                    )}>
                      {status === 'completed' ? <CheckCircle className="w-4 h-4" /> : step.icon}
                    </span>
                  </motion.div>
                  {!isLast && (
                    <div
                      className={cn(
                        'w-0.5 flex-1 min-h-[36px] transition-colors duration-500',
                        status === 'completed' ? 'bg-emerald-400' : 'bg-gray-200',
                      )}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="ml-3.5 pb-7 flex-1 min-w-0">
                  <p className={cn(
                    'text-[14px] font-semibold transition-colors',
                    status === 'completed' && 'text-gray-900',
                    status === 'current' && 'text-[var(--color-primary)]',
                    status === 'pending' && 'text-gray-400',
                  )}>
                    {label}
                  </p>
                  {status === 'current' && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[12px] text-[var(--color-primary)] mt-0.5 font-medium"
                    >
                      {description}
                    </motion.p>
                  )}
                  {status === 'completed' && stepDate && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {formatDate(stepDate)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
