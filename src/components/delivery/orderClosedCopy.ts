import { formatPrice } from '../../lib/utils';
import type { Order } from '../../types/order';

export interface ClosedCopy {
  kind: 'dispute' | 'resolved' | 'cancelled';
  title: string;
  message: string;
  /** Où en est l'argent : la question que tout le monde se pose après une annulation. */
  money: string;
}

/**
 * Texte d'une commande annulée ou en litige, selon le mode de paiement et
 * selon que l'on regarde en acheteur ou en vendeur. Renvoie null si la
 * commande suit son cours.
 */
export function getClosedCopy(order: Order, userId?: string | null): ClosedCopy | null {
  const delivery = Array.isArray(order.delivery_assignment)
    ? order.delivery_assignment[0]
    : (order.delivery_assignment as any);

  const isDisputed = delivery?.status === 'disputed' || order.status === 'disputed';
  const isCancelled = order.status === 'cancelled';
  if (!isCancelled && !isDisputed) return null;

  const isSeller = userId === order.seller_id;
  const isPickup = order.delivery_mode === 'pickup' || order.delivery_mode === 'pickup_point';
  const isCashAtShop = order.payment_method === 'cash_at_shop';
  const isCod = order.payment_method === 'cod';
  const cancelReason = (order as any).cancel_reason as string | undefined;
  const isSellerUnavailable = cancelReason === 'unavailable' || cancelReason === 'seller_unavailable';

  // Litige arbitré par l'équipe : la commande est annulée avec un motif
  // `admin_refund_*` posé par resolve_delivery_dispute.
  const cancelReasonRaw = (order as any).cancel_reason as string | undefined;
  if (isCancelled && cancelReasonRaw?.startsWith('admin_refund')) {
    const partial = cancelReasonRaw === 'admin_refund_partial';
    if (userId === order.seller_id) {
      return {
        kind: 'resolved',
        title: 'Litige réglé',
        message: partial
          ? 'L’acheteur était absent : le livreur a été dédommagé et le colis vous est rapporté.'
          : 'L’équipe DaloaMarket a tranché en faveur de l’acheteur.',
        money: 'Aucun versement pour cette commande',
      };
    }
    return {
      kind: 'resolved',
      title: 'Litige réglé',
      message: partial
        ? 'L’article vous est remboursé ; la course du livreur reste due.'
        : 'L’équipe DaloaMarket a tranché en votre faveur.',
      money: `Remboursement de ${formatPrice(partial ? order.product_amount : order.total_amount)} en cours vers votre Mobile Money`,
    };
  }

  if (isDisputed) {
    return {
      kind: 'dispute',
      title: 'Litige en cours',
      message: isSeller
        ? 'Un problème a été signalé sur cette vente. L’équipe DaloaMarket examine le dossier et revient vers vous.'
        : 'Un problème a été signalé sur votre livraison. L’équipe DaloaMarket examine le dossier et revient vers vous.',
      money: isCod || isCashAtShop ? 'Aucun paiement en ligne' : 'Argent bloqué en séquestre jusqu’à la décision',
    };
  }

  if (isCashAtShop) {
    return isSeller
      ? {
          kind: 'cancelled',
          title: 'Réservation annulée par le client',
          message: 'L’acheteur a annulé sa réservation. L’article a été remis en stock.',
          money: 'Aucun paiement',
        }
      : {
          kind: 'cancelled',
          title: 'Réservation annulée',
          message: 'Votre réservation en boutique a bien été annulée.',
          money: 'Rien n’a été débité',
        };
  }

  if (isCod) {
    return isSeller
      ? {
          kind: 'cancelled',
          title: 'Commande annulée par le client',
          message: 'L’acheteur a annulé sa commande avec paiement à la livraison. L’article est remis en vente.',
          money: 'Aucun paiement',
        }
      : {
          kind: 'cancelled',
          title: 'Commande annulée',
          message: 'La commande a été annulée avant l’envoi du coursier.',
          money: 'Rien n’a été débité',
        };
  }

  // Payé en ligne : l'acheteur est remboursé.
  if (isSeller) {
    return {
      kind: 'cancelled',
      title: isSellerUnavailable ? 'Commande annulée (article indisponible)' : 'Commande annulée par l’acheteur',
      message: isSellerUnavailable
        ? 'Vous avez annulé cette commande car l’article n’est plus disponible.'
        : 'L’acheteur a annulé sa commande avant l’expédition. L’article a été remis en stock.',
      money: 'Acheteur remboursé',
    };
  }
  return {
    kind: 'cancelled',
    title: isSellerUnavailable ? 'Article indisponible chez le vendeur' : isPickup ? 'Réservation annulée' : 'Commande annulée',
    message: isSellerUnavailable
      ? 'Le vendeur ne peut pas honorer la commande.'
      : 'Votre commande a été annulée.',
    money: `Remboursement de ${formatPrice(order.total_amount)} en cours vers votre Mobile Money`,
  };
}
