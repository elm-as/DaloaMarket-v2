export type PlatformFilter =
  | 'all'
  | 'market_only'
  | 'delivery'
  | 'both'
  | 'banned'
  | 'appeals'
  | 'suspect'
  | 'deleted'
  | 'rejoins';

export interface AdminDeliveryPersonSummary {
  id: string;
  user_id: string;
  name?: string | null;
  phone?: string | null;
  is_available?: boolean | null;
  is_verified?: boolean | null;
  vehicle_type?: string | null;
  created_at?: string | null;
  payout_network?: string | null;
}

export interface AdminRejoinFlag {
  new_user_id: string;
  previous_user_id: string;
  matched_kind: string;
  auto_banned?: boolean | null;
  auto_suspect?: boolean | null;
  previous_state?: string | null;
  created_at?: string | null;
}

export interface AdminUserRecord {
  id: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  shop_name?: string | null;
  role?: string | null;
  created_at: string;
  banned?: boolean | null;
  ban_reason?: string | null;
  ban_appeal_status?: string | null;
  ban_appeal_reason?: string | null;
  suspect?: boolean | null;
  suspect_reason?: string | null;
  deleted_at?: string | null;
  last_ip?: string | null;
  registration_ip?: string | null;
  consecutive_cancellations?: number | null;
  cancellation_count?: number | null;
  delivery_person: AdminDeliveryPersonSummary | null;
  listings_count: number;
  isDelivery: boolean;
  isMarket: boolean;
  isBoth: boolean;
  isDeliveryOnly: boolean;
  isMarketOnly: boolean;
  rejoin: AdminRejoinFlag | null;
  displayName: string | null;
  displayNameFromDriver: boolean;
}

export interface AdminUserCounts {
  allCount: number;
  marketCount: number;
  deliveryCount: number;
  bothCount: number;
  bannedCount: number;
  appealCount: number;
  suspectCount: number;
  deletedCount: number;
  rejoinCount: number;
}

export interface AdminUsersActions {
  onChangeRole: (userId: string, newRole: string) => void;
  onResetCancellations: (userId: string) => void;
  onOpenFlagModal: (user: AdminUserRecord) => void;
  onOpenBanModal: (user: AdminUserRecord) => void;
  onUnban: (userId: string) => void;
  onCopyText: (text: string, label: string) => void;
}

export function formatCleanWhatsappPhone(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  const normalized = String(rawPhone).replace(/\D/g, '').replace(/^225/, '');
  return normalized || null;
}
