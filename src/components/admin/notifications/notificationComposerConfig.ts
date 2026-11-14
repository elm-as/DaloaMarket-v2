import type { CampaignSegment } from '../../../lib/pushNotifications';
import type { NotificationAudience } from './notificationTemplates.types';

export const AUDIENCES: {
  value: NotificationAudience;
  label: string;
  sub: string;
  isSegmented?: boolean;
}[] = [
  { value: 'all', label: 'Tout le monde', sub: 'Market & Delivery ($nom ok)' },
  { value: 'market', label: 'DaloaMarket', sub: 'Acheteurs & Vendeurs ($nom ok)' },
  { value: 'delivery', label: 'DaloaDelivery', sub: 'Livreurs uniquement ($nom ok)' },
  { value: 'dormant', label: 'Inactifs (0 annonce / 0 achat)', sub: 'Relance d’activation ($nom)', isSegmented: true },
  { value: 'active_seller', label: 'Vendeurs actifs', sub: 'Partage & statut WA ($nom, $lien)', isSegmented: true },
  { value: 'seller_no_promo', label: 'Vendeurs sans promo', sub: 'Incitation Promo Flash ($nom, $lien)', isSegmented: true },
  { value: 'buyer_cancelled', label: 'Acheteurs hésitants', sub: 'Réassurance commande ($nom)', isSegmented: true },
];

export const SEGMENT_AUDIENCES = new Set<CampaignSegment>([
  'dormant',
  'active_seller',
  'seller_no_promo',
  'buyer_cancelled',
]);

export const QUICK_LINKS = [
  { label: 'Accueil', url: '/' },
  { label: 'Publier', url: '/publier' },
  { label: 'Ma boutique', url: '/profile?tab=shop' },
  { label: 'Pack Crédits', url: '/acheter-pack' },
  { label: 'Chaîne WhatsApp', url: 'https://whatsapp.com/channel/0029Vb94o2vJENy5kkADR42U' },
  { label: 'Espace livreur', url: 'https://delivery.daloamarket.com/dashboard' },
];

export const DYNAMIC_VARIABLES = [
  { token: '$nom', label: '$nom (Prénom)' },
  { token: '$lien', label: '$lien (Lien boutique)' },
  { token: '$numero', label: '$numero (WhatsApp support)' },
  { token: '$chaine', label: '$chaine (Chaîne WA)' },
];

export const TITLE_MAX = 65;
export const BODY_MAX = 200;

/**
 * Formate un aperçu local représentatif en remplaçant les variables dynamiques (`$nom`, `$lien`, etc.).
 */
export function formatSamplePreviewText(text: string): string {
  return text
    .replace(/\{\{nom\}\}|\$\{nom\}|\{nom\}|\$nom\b/gi, 'Kouamé')
    .replace(/\{\{lien\}\}|\$\{lien\}|\{lien\}|\$lien\b/gi, 'daloamarket.com/shop/kouame-mode')
    .replace(/\{\{chaine(?:\s*wa)?\}\}|\$\{chaine(?:\s*wa)?\}|\{chaine(?:\s*wa)?\}|\$chaine(?:\s*wa)?\b/gi, 'whatsapp.com/channel/0029...')
    .replace(/\{\{\+?numero(?:\s*wa)?\}\}|\$\{\+?numero(?:\s*wa)?\}|\{\+?numero(?:\s*wa)?\}|\$\+?numero(?:\s*wa)?\b/gi, '+225 07 04 16 33 61');
}
