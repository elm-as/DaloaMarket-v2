import type { AdminBadgeTone } from '../ui/AdminUI';

/** Statuts de `delivery_assignments` et `orders`, en français clair. */
export const DELIVERY_STATUS: Record<string, { label: string; tone: AdminBadgeTone }> = {
  pending: { label: 'Attente paiement', tone: 'warning' },
  paid: { label: 'Payée', tone: 'info' },
  funded: { label: 'Financée', tone: 'info' },
  confirmed: { label: 'Confirmée', tone: 'info' },
  pending_seller_confirmation: { label: 'Attente vendeur', tone: 'warning' },
  awaiting_pickup: { label: 'Attente livreur', tone: 'warning' },
  accepted: { label: 'Vers vendeur', tone: 'info' },
  picked_up: { label: 'Colis récupéré', tone: 'info' },
  in_transit: { label: 'En livraison', tone: 'info' },
  delivered: { label: 'Livrée', tone: 'success' },
  completed: { label: 'Terminée', tone: 'success' },
  auto_released: { label: 'Clôturée', tone: 'success' },
  disputed: { label: 'Litige', tone: 'danger' },
  cancelled: { label: 'Annulée', tone: 'neutral' },
  refunded: { label: 'Remboursée', tone: 'neutral' },
};

export const deliveryStatus = (status: string) =>
  DELIVERY_STATUS[status] || { label: status, tone: 'neutral' as const };

export const ACTIVE_DELIVERY_STATUSES = [
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

export const DELIVERED_DELIVERY_STATUSES = ['delivered', 'completed', 'auto_released'];
