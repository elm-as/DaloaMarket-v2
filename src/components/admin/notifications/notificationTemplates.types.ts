export type NotificationCategory =
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
  /** Application visée par défaut (sinon DaloaMarket). */
  audience?: 'market' | 'delivery';
}
