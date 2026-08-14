import React from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, Package as PackageIcon, Truck, ClipboardCheck, Store, MapPin } from 'lucide-react';
import { cn, formatDate } from '../../lib/utils';
import type { Order } from '../../types/order';
export type UserRole = 'seller' | 'buyer' | 'delivery' | 'other';

type TimelineStep = 'confirmed' | 'seller_confirmed' | 'picked_up' | 'in_transit' | 'ready_pickup' | 'delivered';

interface StepDef {
  key: TimelineStep;
  icon: React.ReactNode;
  labels: Record<UserRole, { label: string; description: string }>;
}

const DELIVERY_STEPS: StepDef[] = [
  {
    key: 'confirmed',
    icon: <Shield className="w-4 h-4" />,
    labels: {
      buyer:    { label: 'Commande enregistrée', description: 'Votre commande est confirmée.' },
      seller:   { label: 'Commande reçue',       description: 'Une nouvelle commande a été passée.' },
      delivery: { label: 'Commande disponible',  description: 'Une course est en préparation.' },
      other:    { label: 'Commande confirmée',   description: 'La commande a été enregistrée.' },
    },
  },
  {
    key: 'seller_confirmed',
    icon: <ClipboardCheck className="w-4 h-4" />,
    labels: {
      buyer:    { label: 'Vendeur prêt',         description: 'Le vendeur a confirmé la disponibilité du colis.' },
      seller:   { label: 'Confirmation vendeur', description: 'Vous avez confirmé la disponibilité du colis.' },
      delivery: { label: 'Vendeur prêt',         description: 'Le colis est prêt chez le vendeur.' },
      other:    { label: 'Vendeur prêt',         description: 'Le vendeur a préparé le colis.' },
    },
  },
  {
    key: 'picked_up',
    icon: <PackageIcon className="w-4 h-4" />,
    labels: {
      buyer:    { label: 'Colis récupéré',       description: 'Le livreur a récupéré le colis chez le vendeur.' },
      seller:   { label: 'Colis récupéré',       description: 'Le livreur a récupéré le colis.' },
      delivery: { label: 'Colis récupéré',       description: 'Vous avez récupéré le colis chez le vendeur.' },
      other:    { label: 'Colis récupéré',       description: 'Le livreur a récupéré le colis chez le vendeur.' },
    },
  },
  {
    key: 'in_transit',
    icon: <Truck className="w-4 h-4" />,
    labels: {
      buyer:    { label: 'En livraison',         description: 'Le livreur est en route vers votre adresse.' },
      seller:   { label: 'En livraison',         description: 'Le livreur est en route vers l\'acheteur.' },
      delivery: { label: 'En livraison',         description: 'Vous êtes en route vers le client.' },
      other:    { label: 'En livraison',         description: 'Le livreur est en route.' },
    },
  },
  {
    key: 'delivered',
    icon: <CheckCircle className="w-4 h-4" />,
    labels: {
      buyer:    { label: 'Livré',                description: 'Votre colis a été remis avec succès !' },
      seller:   { label: 'Livré',                description: 'Le colis a été remis à l\'acheteur !' },
      delivery: { label: 'Livré',                description: 'Vous avez finalisé la livraison !' },
      other:    { label: 'Livré',                description: 'La livraison est terminée.' },
    },
  },
];

const PICKUP_STEPS: StepDef[] = [
  {
    key: 'confirmed',
    icon: <Store className="w-4 h-4" />,
    labels: {
      buyer:    { label: 'Réservation enregistrée', description: 'Votre demande de retrait en boutique a été enregistrée.' },
      seller:   { label: 'Réservation reçue',       description: 'L\'acheteur a réservé cet article pour un retrait en boutique.' },
      delivery: { label: 'Réservation boutique',    description: 'Retrait direct en boutique sans livreur.' },
      other:    { label: 'Réservation enregistrée', description: 'Retrait en boutique.' },
    },
  },
  {
    key: 'seller_confirmed',
    icon: <ClipboardCheck className="w-4 h-4" />,
    labels: {
      buyer:    { label: 'Article mis de côté',     description: 'Le vendeur a confirmé que l\'article est disponible.' },
      seller:   { label: 'Disponibilité confirmée', description: 'Vous avez mis l\'article de côté pour l\'acheteur.' },
      delivery: { label: 'Article disponible',      description: 'Disponible en boutique.' },
      other:    { label: 'Article disponible',      description: 'Disponible en boutique.' },
    },
  },
  {
    key: 'ready_pickup',
    icon: <MapPin className="w-4 h-4" />,
    labels: {
      buyer:    { label: 'Prêt pour retrait',       description: 'Rendez-vous à la boutique pour récupérer votre article.' },
      seller:   { label: 'En attente de l\'acheteur', description: 'L\'acheteur peut venir retirer son article en boutique.' },
      delivery: { label: 'En attente acheteur',     description: 'Retrait en boutique.' },
      other:    { label: 'Prêt pour retrait',       description: 'En attente de retrait.' },
    },
  },
  {
    key: 'delivered',
    icon: <CheckCircle className="w-4 h-4" />,
    labels: {
      buyer:    { label: 'Article retiré & reçu',   description: 'Vous avez récupéré votre article en boutique !' },
      seller:   { label: 'Remis à l\'acheteur',     description: 'L\'article a été remis en mains propres à l\'acheteur.' },
      delivery: { label: 'Article retiré',          description: 'Retrait terminé.' },
      other:    { label: 'Article retiré',          description: 'Retrait terminé.' },
    },
  },
];

function isStepCompleted(step: TimelineStep, order: Order, isPickup: boolean): boolean {
  const delivery = Array.isArray(order.delivery_assignment) 
    ? order.delivery_assignment[0] 
    : (order.delivery_assignment as any);

  if (isPickup) {
    switch (step) {
      case 'confirmed': return true;
      case 'seller_confirmed': return order.status !== 'pending' || !!delivery?.pickup_confirmed_by_seller;
      case 'ready_pickup': return order.status !== 'pending' || !!delivery?.pickup_confirmed_by_seller;
      case 'delivered': return order.status === 'delivered' || order.status === 'completed';
      default: return false;
    }
  }

  switch (step) {
    case 'confirmed': return true;
    case 'seller_confirmed': return delivery?.status !== 'pending_seller_confirmation' && !!delivery?.pickup_confirmed_by_seller;
    case 'picked_up': return delivery?.status === 'in_transit' || delivery?.status === 'delivered' || order.status === 'in_transit' || order.status === 'delivered';
    case 'in_transit': return order.status === 'in_transit' || order.status === 'delivered';
    case 'delivered': return order.status === 'delivered' || order.status === 'completed';
    default: return false;
  }
}

function getStepStatus(step: TimelineStep, order: Order, steps: StepDef[], isPickup: boolean): 'completed' | 'current' | 'pending' {
  const orderArray = steps.map(s => s.key);
  const lastCompletedIndex = orderArray.reduce((lastIndex, currentStep, index) => {
    return isStepCompleted(currentStep, order, isPickup) ? index : lastIndex;
  }, -1);

  const stepIndex = orderArray.indexOf(step);
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
  const isPickup = order.delivery_mode === 'pickup' || order.delivery_mode === 'pickup_point';
  const steps = isPickup ? PICKUP_STEPS : DELIVERY_STEPS;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-[13px] font-bold text-gray-900 mb-3.5">
          {isPickup ? 'Progression du retrait en boutique' : 'Progression de la livraison'}
        </h3>

        <div className="space-y-0">
          {steps.map((step, index) => {
            const status = getStepStatus(step.key, order, steps, isPickup);
            const isLast = index === steps.length - 1;
            const stepDate = getStepDate(step.key, order);
            const { label, description } = step.labels[role];

            return (
              <div key={step.key} className="flex items-stretch">
                {/* Connector */}
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: status === 'completed' ? '#10B981' : status === 'current' ? '#f97316' : '#F3F4F6',
                      borderColor: status === 'completed' ? '#10B981' : status === 'current' ? '#f97316' : '#E5E7EB',
                    }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border relative',
                    )}
                  >
                    {status === 'current' && (
                      <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping" />
                    )}
                    <span className={cn(
                      'relative z-10',
                      (status === 'completed' || status === 'current') ? 'text-white' : 'text-gray-400',
                    )}>
                      {status === 'completed' ? <CheckCircle className="w-3.5 h-3.5" /> : step.icon}
                    </span>
                  </motion.div>
                  {!isLast && (
                    <div
                      className={cn(
                        'w-0.5 flex-1 min-h-[22px] transition-colors duration-300',
                        status === 'completed' ? 'bg-emerald-400' : 'bg-gray-200',
                      )}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="ml-3 pb-4 flex-1 min-w-0">
                  <p className={cn(
                    'text-[13px] font-bold leading-tight transition-colors',
                    status === 'completed' && 'text-gray-900',
                    status === 'current' && 'text-orange-600',
                    status === 'pending' && 'text-gray-400 font-medium',
                  )}>
                    {label}
                  </p>
                  {status === 'current' && (
                    <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">
                      {description}
                    </p>
                  )}
                  {status === 'completed' && stepDate && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
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
