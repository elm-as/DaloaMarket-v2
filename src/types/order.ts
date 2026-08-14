export interface RpcResult {
  success: boolean;
  reason?: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  total_amount: number;
  product_amount: number;
  delivery_fee: number;
  status: string;
  delivery_mode: string;
  delivery_address: string | null;
  created_at: string;
  variant_id?: string | null;
  variant_label?: string | null;
  unit_price?: number | null;
  quantity?: number;
  listing_title?: string;
  listing_photos?: string[];
  buyer_name?: string;
  buyer_phone?: string;
  seller_name?: string;
  delivery_assignment?: {
    id: string;
    delivery_person_id: string | null;
    status: 'pending_seller_confirmation' | 'awaiting_pickup' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | string;
    pickup_confirmed_by_seller: boolean;
    pickup_confirmed_at: string | null;
    pickup_otp: string;
    delivery_otp: string;
    pickup_otp_attempts: number;
    delivery_otp_attempts: number;
    delivered_at: string | null;
    buyer_confirmed_at: string | null;
  }[];
  delivery_person?: { name: string; phone: string; } | null;
  delivery_person_location?: [number, number] | null;
  delivery_person_id?: string;
  seller_lat?: number;
  seller_lng?: number;
  delivery_lat?: number;
  delivery_lng?: number;
}
