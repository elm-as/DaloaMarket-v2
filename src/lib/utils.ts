import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

export function getOptimizedImageUrl(url: string | null | undefined, width = 400, quality = 75): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  if (url.includes('images.pexels.com')) {
    const baseUrl = url.split('?')[0];
    return `${baseUrl}?auto=compress&cs=tinysrgb&w=${width}&q=${quality}`;
  }

  if (url.includes('images.unsplash.com')) {
    const baseUrl = url.split('?')[0];
    return `${baseUrl}?auto=format&fit=crop&w=${width}&q=${quality}`;
  }

  return url;
}

export const extractUuid = (input: string): string | null => {
  if (!input) return null;
  const match = input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : null;
};

/** Coordonnées centrales de la ville de Daloa */
export const DALOA_CENTER_COORDS = { lat: 6.8773, lng: -6.4502 };

/** Rayon de couverture géographique officiel pour Daloa (en km) */
export const DALOA_GEOFENCE_RADIUS_KM = 18;

/**
 * Calcule la distance en km entre 2 points GPS (formule de Haversine)
 */
export function getDistanceFromDaloaCenterKm(lat: number, lng: number): number {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 9999;
  const R = 6371;
  const dLat = ((lat - DALOA_CENTER_COORDS.lat) * Math.PI) / 180;
  const dLon = ((lng - DALOA_CENTER_COORDS.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((DALOA_CENTER_COORDS.lat * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Vérifie si des coordonnées GPS se situent dans le périmètre de Daloa
 */
export function isLocationInDaloa(lat: number, lng: number, maxRadiusKm = DALOA_GEOFENCE_RADIUS_KM): boolean {
  return getDistanceFromDaloaCenterKm(lat, lng) <= maxRadiusKm;
}

export const getListingPath = (id: string, _title?: string): string => {
  if (!id) return '/';
  const shortId = id.length >= 8 ? id.slice(0, 8) : id;
  return `/l/${shortId}`;
};

export const getSellerPath = (sellerId: string, shopSlug?: string | null): string => {
  if (!sellerId) return '/';
  if (shopSlug) return `/shop/${shopSlug}`;
  const shortId = sellerId.length >= 8 ? sellerId.slice(0, 8) : sellerId;
  return `/b/${shortId}`;
};

export const getListingShareUrl = (id: string): string => {
  if (!id) return typeof window !== 'undefined' ? window.location.origin : 'https://daloamarket.com';
  const shortId = id.length >= 8 ? id.slice(0, 8) : id;
  return `${typeof window !== 'undefined' ? window.location.origin : 'https://daloamarket.com'}/l/${shortId}`;
};

export const getSellerShareUrl = (sellerId: string, shopSlug?: string | null): string => {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://daloamarket.com';
  if (!sellerId) return base;
  if (shopSlug) return `${base}/shop/${shopSlug}`;
  const shortId = sellerId.length >= 8 ? sellerId.slice(0, 8) : sellerId;
  return `${base}/b/${shortId}`;
};

export const formatListingShareText = (listing: { id: string; title: string; price: number; district?: string }) => {
  const url = getListingShareUrl(listing.id);
  const formattedPrice = formatPrice(listing.price);
  const districtText = listing.district ? `\n📍 Quartier : ${listing.district} (Daloa)` : '';
  const text = `🛍️ *${listing.title}*\n💰 Prix : *${formattedPrice}*${districtText}\n\n👉 Retrouvez cet article sur DaloaMarket :\n${url}`;
  return {
    title: listing.title,
    text,
    url,
  };
};

export interface ShopShareInfo {
  id: string;
  shop_name?: string | null;
  full_name?: string | null;
  shop_slug?: string | null;
  district?: string | null;
  listing_count?: number;
  cash_on_delivery?: boolean;
}

export const formatShopShareText = (shop: ShopShareInfo) => {
  const url = getSellerShareUrl(shop.id, shop.shop_slug);
  const shopTitle = shop.shop_name || shop.full_name || 'Boutique DaloaMarket';
  const parts: string[] = [`🏪 *${shopTitle}* — Boutique à Daloa`];

  const meta: string[] = [];
  if (shop.listing_count != null && shop.listing_count > 0) meta.push(`📦 ${shop.listing_count} article${shop.listing_count > 1 ? 's' : ''} en ligne`);
  if (shop.district) meta.push(`📍 ${shop.district} (Daloa)`);
  if (shop.cash_on_delivery) meta.push('💳 Paiement à la livraison accepté');
  if (meta.length > 0) parts.push(meta.join(' • '));

  parts.push(`\n👉 Voir ma boutique :\n${url}`);

  const text = parts.join('\n');
  return {
    title: shopTitle,
    text,
    url,
  };
};

export const openWhatsAppShare = (text: string) => {
  if (typeof window === 'undefined') return;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
};

export const shareWithImage = async (
  title: string,
  text: string,
  imageUrl?: string | null
): Promise<{ success: boolean; copied: boolean }> => {
  if (typeof window === 'undefined') return { success: false, copied: false };

  // Always copy formatted caption to clipboard first for seamless paste on desktop Web Share
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    copied = false;
  }

  if (imageUrl && navigator.share) {
    try {
      const response = await fetch(imageUrl, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        const mimeType = blob.type || 'image/jpeg';
        const ext = mimeType.split('/')[1] || 'jpg';
        const file = new File([blob], `share-${Date.now()}.${ext}`, { type: mimeType });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title,
            text,
            files: [file],
          });
          return { success: true, copied };
        }
      }
    } catch (err) {
      console.warn('Image share failed, falling back to text share:', err);
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return { success: true, copied };
    } catch {
      return { success: false, copied };
    }
  } else {
    return { success: false, copied };
  }
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's an Ivorian number
  if (cleaned.startsWith('225') && cleaned.length === 13) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10)}`;
  }
  
  // If it's already without country code
  if (cleaned.length === 10) {
    return `+225 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`;
  }
  
  // Return as is if format is unknown
  return phone;
};

export const validateIvorianPhone = (phone: string): boolean => {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it starts with Ivory Coast country code (225)
  if (cleaned.startsWith('225')) {
    return cleaned.length === 13;
  }
  
  // If it's without country code, should be 10 digits
  return cleaned.length === 10;
};

export const getConditionLabel = (condition: string): string => {
  const conditions: Record<string, string> = {
    'new': 'Neuf',
    'like_new': 'Très bon état',
    'good': 'Bon état',
    'used': 'Usagé',
  };
  
  return conditions[condition] || condition;
};

export const getCategoryLabel = (category: string): string => {
  const categories: Record<string, string> = {
    'fashion': 'Mode & Accessoires',
    'electronics': 'Électronique & High-tech',
    'home': 'Maison & Jardin',
    'vehicles': 'Auto & Moto',
    'sports': 'Sports & Loisirs',
    'books': 'Livres & Culture',
    'food': 'Alimentaire',
  };
  
  return categories[category] || category;
};

export const DISTRICTS = [
  // Très cités (5+)
  'Abattoir',
  'Orly',
  'Lobia',
  'Kennedy',
  'Soleil',
  'Texas',
  'Tazibouo',
  'Huberson',
  'Labia',
  'Millionnaire',
  'Fadiga',
  'Marin',
  'Cissoko',
  'Évêché',
  'Garage',
  'Gbeulville',
  'Suisse',
  // Cités (2-4)
  'Balouzon',
  'Belle-ville',
  'Commerce',
  'Dioulabougou',
  'Quartier Baoulé',
  'Cafop',
  'Koyakabougou',
  'Liberia',
  'Manioc',
  'Mossibougou',
  'Sapia',
  'Savonnerie',
  'Wolof',
  // Peu cités (1)
  'Àhoussabougou',
  'Batar',
  'Belle Côte',
  'Brésil',
  'Cité Verte',
  'Cocotier',
  'Corridor',
  'Gbokora',
  'Hodjinninkloni',
  'Houssoukro',
  'Institut Pastoral',
  'Jacqueville',
  'Koutoukou',
  'Mines',
  'Monshibougou',
  'Palmeraie',
  'Parlement',
  'Penarole',
  'Petit Paris',
  'Pointé',
  'Seryville',
  'Soweto',
  'Tagoura',
  'Tapeguhe',
  'Wata',
  'Yêmakônô',
  'Zèguéguia',
];

export const CATEGORIES = [
  { id: 'fashion', label: 'Mode & Accessoires' },
  { id: 'electronics', label: 'Électronique & High-tech' },
  { id: 'home', label: 'Maison & Jardin' },
  { id: 'vehicles', label: 'Auto & Moto' },
  { id: 'sports', label: 'Sports & Loisirs' },
  { id: 'books', label: 'Livres & Culture' },
  { id: 'food', label: 'Alimentaire' },
];

export const CONDITIONS = [
  { id: 'new', label: 'Neuf' },
  { id: 'like_new', label: 'Très bon état' },
  { id: 'good', label: 'Bon état' },
  { id: 'used', label: 'Usagé' },
];

/**
 * Répartit intelligemment les annonces boostées parmi les annonces normales.
 * - 1 annonce boostée est insérée tous les `interval` slots (défaut : 3).
 * - Les boostées sont mélangées aléatoirement entre elles pour l'équité.
 * - Si trop de boosts, l'excédent est placé à la suite (jamais perdu).
 */
export function interleaveBoosted<T extends { boosted_until?: string | null }>(
  listings: T[],
  interval = 3,
): T[] {
  const now = new Date();
  const boosted: T[] = [];
  const regular: T[] = [];

  for (const l of listings) {
    if (l.boosted_until && new Date(l.boosted_until) > now) {
      boosted.push(l);
    } else {
      regular.push(l);
    }
  }

  if (boosted.length === 0) return listings;

  // Mélange aléatoire des boostées (Fisher-Yates) pour équité
  for (let i = boosted.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [boosted[i], boosted[j]] = [boosted[j], boosted[i]];
  }

  const result: T[] = [];
  let bIdx = 0;
  let rIdx = 0;

  while (rIdx < regular.length || bIdx < boosted.length) {
    // Insérer un boost à chaque `interval` positions (0, interval, 2*interval…)
    if (bIdx < boosted.length && result.length % interval === 0) {
      result.push(boosted[bIdx++]);
    } else if (rIdx < regular.length) {
      result.push(regular[rIdx++]);
    } else {
      // Plus de regulars, ajouter les boosts restants
      result.push(boosted[bIdx++]);
    }
  }

  return result;
}

/**
 * Diversifie le fil d'annonces pour éviter qu'un seul vendeur n'accapare tout l'affichage.
 * - Limite le nombre d'annonces consécutives du même vendeur (ex: max 2).
 * - Applique un algorithme Round-Robin par vendeur pour mélanger équitablement l'ensemble des vendeurs.
 */
export function diversifySellers<T extends { user_id?: string; listing_user_id?: string }>(
  listings: T[],
  maxConsecutivePerSeller = 2
): T[] {
  if (listings.length <= 1) return listings;

  // Regrouper les annonces par vendeur
  const sellerMap = new Map<string, T[]>();
  for (const l of listings) {
    const sellerId = l.user_id || l.listing_user_id || 'unknown';
    if (!sellerMap.has(sellerId)) {
      sellerMap.set(sellerId, []);
    }
    sellerMap.get(sellerId)!.push(l);
  }

  // Si un seul vendeur dans toute la liste, rien à diversifier
  if (sellerMap.size <= 1) return listings;

  const result: T[] = [];
  const sellerQueues = Array.from(sellerMap.values());
  
  let currentSellerId: string | null = null;
  let consecutiveCount = 0;

  while (result.length < listings.length) {
    let itemAdded = false;

    for (let i = 0; i < sellerQueues.length; i++) {
      const queue = sellerQueues[i];
      if (queue.length === 0) continue;

      const itemSellerId = queue[0].user_id || queue[0].listing_user_id || 'unknown';

      // Si c'est le même vendeur que le précédent et qu'on a déjà atteint maxConsecutivePerSeller,
      // on essaie de sauter cette queue si d'autres vendeurs sont disponibles
      if (itemSellerId === currentSellerId && consecutiveCount >= maxConsecutivePerSeller) {
        const hasOtherSellers = sellerQueues.some(
          (q, idx) => idx !== i && q.length > 0
        );
        if (hasOtherSellers) {
          continue; // Sauter vers un autre vendeur
        }
      }

      // Prendre l'annonce
      const item = queue.shift()!;
      result.push(item);

      if (itemSellerId === currentSellerId) {
        consecutiveCount++;
      } else {
        currentSellerId = itemSellerId;
        consecutiveCount = 1;
      }

      itemAdded = true;
      break;
    }

    // Sécurité au cas où aucune queue n'a pu être sélectionnée
    if (!itemAdded) {
      for (const queue of sellerQueues) {
        if (queue.length > 0) {
          result.push(queue.shift()!);
          break;
        }
      }
    }
  }

  return result;
}