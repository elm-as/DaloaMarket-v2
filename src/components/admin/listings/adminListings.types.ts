import { formatPrice, getListingPath } from '../../../lib/utils';

export interface AdminListing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  district: string;
  photos: string[];
  boosted_until: string | null;
  created_at: string;
  status: 'active' | 'sold' | 'deleted';
  contact_phone: string | null;
  stock: number;
  user?: {
    id: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    shop_name: string | null;
    shop_slug: string | null;
  } | null;
}

export type AdminListingStatusFilter = 'all' | 'active' | 'sold' | 'deleted';

export interface AdminListingStatusCounts {
  all: number;
  active: number;
  sold: number;
  deleted: number;
}

export function buildListingWhatsAppShareText(listing: AdminListing): string {
  const listingUrl = `https://daloamarket.com${getListingPath(listing.id)}`;
  const sellerLabel = listing.user?.shop_name || listing.user?.full_name || 'Vendeur DaloaMarket';
  return [
    'NOUVEL ARRIVAGE SUR DALOA MARKET',
    '',
    `*${listing.title}*`,
    `Prix : *${formatPrice(listing.price)}*`,
    `Quartier : ${listing.district || 'Daloa'}`,
    `Vendeur : ${sellerLabel}`,
    '',
    `Voir l'article et commander en toute sécurité :`,
    listingUrl,
    '',
    'Livraison express partout à Daloa avec DaloaDelivery.',
  ].join('\n');
}

export function buildListingsDigestShareText(listings: AdminListing[]): string | null {
  const activeListings = listings.filter((l) => l.status === 'active').slice(0, 5);
  if (activeListings.length === 0) return null;
  const itemsText = activeListings
    .map(
      (l, i) =>
        `${i + 1}. *${l.title}* : ${formatPrice(l.price)} (${l.district || 'Daloa'})\nhttps://daloamarket.com${getListingPath(l.id)}`,
    )
    .join('\n\n');
  return [
    'ARRIVAGES DU JOUR SUR DALOA MARKET',
    '',
    'Découvrez les dernières nouveautés publiées aujourd’hui à Daloa :',
    '',
    itemsText,
    '',
    'Retrouvez toutes les annonces sur : https://daloamarket.com',
  ].join('\n');
}
