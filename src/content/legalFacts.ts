/**
 * Source de vérité unique pour les chiffres cités dans les pages publiques
 * (FAQ, CGU, Confidentialité, À propos, Tarifs, Mentions légales).
 *
 * Règle : aucun pourcentage ni tarif ne doit être écrit en dur dans une page.
 * Tout est dérivé des constantes que le checkout applique réellement
 * (`src/lib/delivery.ts`), afin qu'un changement de grille ne puisse plus
 * laisser les textes publics mentir — c'est exactement ce qui s'était produit
 * (CGU à 3 %, FAQ mobile à 0 %, code à 2 %).
 */

import {
  BUYER_FEE_RATE,
  SELLER_FEE_RATE,
  PRO_SELLER_FEE_RATE,
  DRIVER_FEE_RATE,
  DELIVERY_MIN,
  DELIVERY_FREE_KM,
  DELIVERY_RATE_PER_KM,
} from '../lib/delivery';
import {
  BOOST_CREDIT_COSTS,
  CREDIT_PACKS,
  SELLER_BADGE_PRICE,
  SELLER_BADGE_YEARLY_PRICE,
} from '../lib/featureFlags';

/** Formate un taux (0.02) en pourcentage lisible ("2 %"), virgule décimale française. */
export const pct = (rate: number): string => {
  const value = rate * 100;
  const rounded = Math.round(value * 100) / 100;
  return `${String(rounded).replace('.', ',')} %`;
};

/** Formate un montant en FCFA avec séparateur d'espace insécable ("2 500 FCFA"). */
export const fcfa = (amount: number): string =>
  `${amount.toLocaleString('fr-FR').replace(/ | | /g, ' ')} FCFA`;

/**
 * Régime tarifaire appliqué aujourd'hui.
 *
 * La base de production (`system_settings.phase_config`) est en phase 0 :
 * `seller_fee_override: 0`, `max_free_listings: 999999`,
 * `allow_cod_for_all` / `allow_pickup_for_all` /
 * `allow_affiliated_deliverers_for_all` à `true`.
 * Les textes publics décrivent donc la phase 0 comme régime en vigueur,
 * et annoncent la grille de sortie de lancement comme future.
 */
export const CURRENT_PHASE = {
  label: 'Phase de lancement',
  /** Commission prélevée au vendeur aujourd'hui (override de phase = 0). */
  sellerFeeRate: 0,
  /** Publication d'annonces : aucun plafond appliqué en phase de lancement. */
  unlimitedListings: true,
  /** COD, retrait et livreurs affiliés sont ouverts à tous les vendeurs. */
  proFeaturesOpenToAll: true,
} as const;

export const FEES = {
  /** Frais de service acheteur, réellement facturés au checkout. */
  buyerRate: BUYER_FEE_RATE,
  buyerPct: pct(BUYER_FEE_RATE),
  /** Grille vendeur applicable à la fin de la phase de lancement. */
  sellerStandardPct: pct(SELLER_FEE_RATE),
  sellerProPct: pct(PRO_SELLER_FEE_RATE),
  /** Retenue plateforme sur le montant de la course, côté livreur. */
  driverPlatformPct: pct(DRIVER_FEE_RATE),
  driverNetPct: pct(1 - DRIVER_FEE_RATE),
} as const;

export const DELIVERY = {
  basePrice: fcfa(DELIVERY_MIN),
  baseKm: String(DELIVERY_FREE_KM).replace('.', ','),
  perKm: fcfa(DELIVERY_RATE_PER_KM),
} as const;

export const PRO_PASS = {
  monthly: fcfa(SELLER_BADGE_PRICE),
  yearly: fcfa(SELLER_BADGE_YEARLY_PRICE),
} as const;

/**
 * Visibilité : boost payé en crédits (RPC buy_boost_with_credits), crédits
 * achetés en packs. L'ancien « Boost 500 FCFA » et le « Bump 200 FCFA »
 * n'étaient achetables nulle part : le serveur de paiement refuse ces types.
 */
const joinFr = (items: string[]): string =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} ou ${items[items.length - 1]}`;
export const VISIBILITY = {
  /** « 1 crédit (24 heures), 2 crédits (2 jours) ou 5 crédits (7 jours) » */
  boostOptions: joinFr(BOOST_CREDIT_COSTS.map((o) => `${o.credits} crédit${o.credits > 1 ? 's' : ''} (${o.label})`)),
  /** « 5 crédits pour 500 FCFA, 12 crédits pour 1 000 FCFA ou 30 crédits pour 2 000 FCFA » */
  creditPacks: joinFr(CREDIT_PACKS.map((p) => `${p.credits} crédits pour ${fcfa(p.price)}`)),
} as const;

/** Nombre maximum d'annulations consécutives (system_settings.cancellation_settings). */
export const MAX_CONSECUTIVE_CANCELLATIONS = 3;

/** Contacts officiels. */
/**
 * Coordonnées du support.
 *
 * WhatsApp uniquement : aucun appel n'est pris. D'où l'absence volontaire d'un
 * numéro appelable ici — le remettre ferait réapparaître des liens `tel:` que
 * personne ne décrochera.
 */
export const CONTACT = {
  support: 'support@daloamarket.com',
  whatsappDisplay: '+225 07 04 16 33 61',
  whatsappHref: 'https://wa.me/2250704163361',
} as const;

/**
 * Éditeur de la plateforme.
 *
 * `address` est l'adresse du directeur de la publication ; elle ne se confond
 * pas avec `activityZone`, qui décrit le marché desservi — l'éditeur est à
 * Abidjan, la place de marché sert Daloa.
 *
 * Cette adresse est publique : elle figure dans les mentions légales du site et
 * des deux applications, et les moteurs de recherche l'indexent. C'est le local
 * loué par l'éditeur, choisi en connaissance de cause. Si elle doit changer
 * (boîte postale, domiciliation commerciale), c'est le seul endroit à modifier.
 */
export const PUBLISHER = {
  name: 'OULOBO Elmas Tresor',
  legalForm: 'Entreprise individuelle, non immatriculée au RCCM à ce jour',
  address: 'RueO21,68, Yopougon, Abidjan, Côte d’Ivoire',
  activityZone: 'Daloa et sa région, Côte d’Ivoire',
} as const;

/** Réseaux Mobile Money acceptés via l'agrégateur Money Fusion. */
export const PAYMENT_NETWORKS = 'Wave, Orange Money, MTN MoMo et Moov Money';

/** Statuts de commande réellement présents en base (contrainte orders_status_check). */
export const ORDER_STATUSES = [
  'pending',
  'paid',
  'in_transit',
  'delivered',
  'completed',
  'cancelled',
  'disputed',
] as const;

/** Date de dernière révision des textes légaux, affichée en en-tête des CGU et de la politique. */
export const LEGAL_LAST_UPDATED = '16 septembre 2026';
