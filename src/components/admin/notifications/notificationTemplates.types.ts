export type NotificationAudience =
  | 'all'
  | 'market'
  | 'delivery'
  | 'dormant'
  | 'active_seller'
  | 'seller_no_promo'
  | 'buyer_cancelled';

export type NotificationCategory =
  | 'custom'
  | 'segmented'
  | 'psychology'
  | 'survey'
  | 'diversity'
  | 'first_order'
  | 'whatsapp'
  | 'pwa'
  | 'publish'
  | 'buy'
  | 'events'
  | 'trust'
  | 'drivers'
  | 'reactivate';

export interface NotificationTemplate {
  id: string;
  category: NotificationCategory;
  categoryLabel: string;
  title: string;
  body: string;
  url: string;
  recommendedTime: string;
  /** Audience ou segment ciblé par défaut. */
  audience?: NotificationAudience;
  isCustom?: boolean;
}
