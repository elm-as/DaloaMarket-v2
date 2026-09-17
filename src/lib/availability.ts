/**
 * Disponibilité d'une annonce — source de vérité unique côté web.
 *
 * Jumeau de `packages/utils/src/availability.ts` (les apps mobiles), dupliqué ici
 * parce que ce dépôt ne consomme pas les paquets `@daloa/*`. Toute évolution doit
 * être reportée des deux côtés.
 *
 * Chaque surface calculait sa propre règle et elles se contredisaient : la carte
 * regardait `stock`, la fiche produit regardait `status`. Une annonce remise en
 * vente sans restock (`status: 'active'`, `stock: 0`) s'affichait donc « Épuisé »
 * sur la carte et parfaitement normale sur la fiche, avant de se faire éjecter du
 * panier.
 */

export interface AvailabilityVariant {
  id?: string;
  label?: string | null;
  stock?: number | null;
  active?: boolean | null;
}

export interface AvailabilityListing {
  status?: string | null;
  stock?: number | null;
  variants?: AvailabilityVariant[] | null;
}

/**
 * Un champ absent ne doit jamais être lu comme « indisponible » : certaines
 * surfaces ne transportent qu'une partie de l'annonce. Le panier et la RPC de
 * commande restent les garde-fous qui font autorité.
 */
function hasKnownStock(listing: AvailabilityListing): boolean {
  if (Array.isArray(listing.variants) && listing.variants.length > 0) return true;
  return listing.stock !== null && listing.stock !== undefined;
}

/** Stock réellement vendable : somme des variantes actives, sinon le stock global. */
export function getListingStock(listing: AvailabilityListing | null | undefined): number {
  if (!listing) return 0;

  const variants = Array.isArray(listing.variants) ? listing.variants : [];
  if (variants.length > 0) {
    return variants
      .filter((v) => v.active !== false)
      .reduce((sum, v) => sum + Math.max(0, Number(v.stock) || 0), 0);
  }

  return Math.max(0, Number(listing.stock) || 0);
}

/**
 * Motif d'indisponibilité : `null` = disponible (ou donnée absente),
 * `'sold'` = vendue/retirée, `'out_of_stock'` = épuisée.
 */
export function getUnavailabilityReason(
  listing: AvailabilityListing | null | undefined
): 'sold' | 'out_of_stock' | null {
  if (!listing) return null;
  if (listing.status != null && listing.status !== 'active') return 'sold';
  if (hasKnownStock(listing) && getListingStock(listing) <= 0) return 'out_of_stock';
  return null;
}

/** Une annonce est achetable si elle est active ET qu'il reste du stock. */
export function isListingAvailable(listing: AvailabilityListing | null | undefined): boolean {
  if (!listing) return false;
  return getUnavailabilityReason(listing) === null;
}

/**
 * Résolution de la photo d'une annonce — jumeau de `packages/utils/src/media.ts`.
 *
 * Une URI locale d'appareil (`file://`, `content://`) peut se retrouver en base si
 * un téléversement mobile a échoué. Le navigateur refuse de la charger
 * (« Not allowed to load local resource ») et la vignette reste blanche, sans même
 * déclencher `onError` de façon exploitable : on la traite donc comme absente.
 */
export const LISTING_PHOTO_FALLBACK =
  'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=320';

export function isDisplayablePhotoUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('/')
  );
}

export function resolveListingPhoto(
  photos: unknown,
  fallback: string = LISTING_PHOTO_FALLBACK
): string {
  if (!Array.isArray(photos)) return fallback;
  const first = photos.find((p) => isDisplayablePhotoUrl(p));
  return isDisplayablePhotoUrl(first) ? first.trim() : fallback;
}
