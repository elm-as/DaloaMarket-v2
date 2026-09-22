export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'completed' | 'failed';
export type PayoutType = 'seller' | 'delivery' | 'refund';
export type PayoutWithdrawMode = 'wave-ci' | 'orange-money-ci' | 'mtn-ci' | 'moov-ci' | string;

export interface PayoutItem {
  id: string;
  user_id: string;
  escrow_id?: string | null;
  delivery_assignment_id?: string | null;
  amount: number;
  recipient_phone: string;
  withdraw_mode: PayoutWithdrawMode;
  type: PayoutType;
  status: PayoutStatus;
  scheduled_for?: string | null;
  completed_at?: string | null;
  idempotency_key?: string | null;
  provider_token?: string | null;
  failure_reason?: string | null;
  created_at: string;
  user?: {
    id: string;
    full_name: string | null;
    phone: string | null;
    role?: string | null;
  } | null;
}

export interface DisputeDeliveryItem {
  id: string;
  order_id: string;
  delivery_person_id: string;
  status: string;
  dispute_reason?: string | null;
  pickup_location?: string | null;
  dropoff_location?: string | null;
  delivery_photo_url?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  delivery_person?: {
    id: string;
    user_id?: string;
    name: string;
    phone: string | null;
  } | null;
  order?: {
    id: string;
    status: string;
    product_amount: number;
    delivery_fee: number;
    total_amount: number;
    delivery_address?: string | null;
    buyer_id: string;
    seller_id: string;
    buyer?: { id: string; full_name: string | null; phone: string | null } | null;
    seller?: { id: string; full_name: string | null; phone: string | null } | null;
  } | null;
  mediator?: { id: string; full_name: string | null } | null;
}

export interface PayoutStats {
  totalPaidAmount: number;
  totalPaidCount: number;
  totalPendingAmount: number;
  totalPendingCount: number;
  totalFailedAmount: number;
  totalFailedCount: number;
  sellerPaidAmount: number;
  driverPaidAmount: number;
  refundPaidAmount: number;
}
