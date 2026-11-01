import type { PayoutItem } from '../payouts/types';

export type DeliveryTabFilter = 'all' | 'active' | 'delivered' | 'pickup' | 'cancelled';

export interface AdminDeliveryItem {
  id: string;
  order_id: string;
  /** Vrai si l'élément provient d'une commande sans ligne dans delivery_assignments */
  is_order_only?: boolean;
  delivery_person_id: string | null;
  status: string;
  created_at: string;
  updated_at?: string | null;
  pickup_location?: string | null;
  dropoff_location?: string | null;
  pickup_address?: string | null;
  dropoff_address?: string | null;
  delivery_price?: number | null;
  delivery_photo_url?: string | null;
  dispute_reason?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  delivery_person?: {
    id: string;
    user_id?: string;
    name: string;
    phone: string | null;
    payout_number?: string | null;
    payout_network?: string | null;
  } | null;
  order?: {
    id: string;
    status: string;
    product_amount: number;
    delivery_fee: number;
    total_amount: number;
    delivery_mode?: string | null;
    payment_method?: string | null;
    delivery_address?: string | null;
    buyer_id: string;
    seller_id: string;
    listing_id?: string | null;
    listing?: {
      id?: string;
      title: string;
      photos?: string[] | null;
    } | null;
    buyer?: { id: string; full_name: string | null; phone: string | null } | null;
    seller?: { id: string; full_name: string | null; phone: string | null } | null;
  } | null;
  mediator?: { id: string; full_name: string | null } | null;
  driver_payout?: PayoutItem | null;
}

/**
 * Détermine si une course implique un livreur (exclut les retraits directs en boutique).
 */
export const isDriverDelivery = (item: AdminDeliveryItem): boolean => {
  if (item.order?.delivery_mode === 'pickup' || item.order?.delivery_mode === 'pickup_point') return false;
  const fee = item.delivery_price ?? item.order?.delivery_fee ?? 0;
  if (!item.delivery_person_id && !item.driver_payout && fee === 0) return false;
  return true;
};
