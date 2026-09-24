import type { AdminBadgeTone } from '../ui/AdminUI';

/** Statuts de `delivery_assignments`, en français (ils s'affichaient bruts). */
export const DELIVERY_STATUS: Record<string, { label: string; tone: AdminBadgeTone }> = {
  pending_seller_confirmation: { label: 'Attente vendeur', tone: 'warning' },
  awaiting_pickup: { label: 'Attente livreur', tone: 'warning' },
  accepted: { label: 'Vers le vendeur', tone: 'info' },
  picked_up: { label: 'Colis récupéré', tone: 'info' },
  in_transit: { label: 'En livraison', tone: 'info' },
  delivered: { label: 'Livrée', tone: 'success' },
  auto_released: { label: 'Clôturée', tone: 'success' },
  disputed: { label: 'Litige', tone: 'danger' },
  cancelled: { label: 'Annulée', tone: 'neutral' },
};

export const deliveryStatus = (status: string) => DELIVERY_STATUS[status] || { label: status, tone: 'neutral' as const };
