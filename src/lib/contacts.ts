import { supabase } from './supabase';

/**
 * Colonnes publiques de `users`. Les autres (e-mail, téléphone, Mobile Money,
 * IP, bannissement…) ne sont lisibles que via `users_private` (sa propre ligne,
 * ou toutes pour un admin) et `get_contact_phones`.
 */
export const PUBLIC_USER_COLUMNS =
  'id, full_name, district, created_at, rating, first_listing_at, banned, role, avatar_url, pro_until, pro_source, shop_name, shop_description, shop_banner_url, shop_logo_url, shop_whatsapp, shop_theme_color, shop_updated_at, shop_latitude, shop_longitude, shop_slug, deleted_at';

/**
 * Téléphones que l'utilisateur courant a le droit de voir, par identifiant :
 * vendeurs avec une annonce en ligne, l'autre partie d'une commande, les
 * clients d'une course pour son livreur. Les autres restent absents.
 */
export async function fetchContactPhones(ids: Array<string | null | undefined>): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
  const phones = new Map<string, string>();
  if (unique.length === 0) return phones;

  const { data, error } = await supabase.rpc('get_contact_phones', { p_user_ids: unique });
  if (error) {
    console.warn('[contacts] get_contact_phones:', error.message);
    return phones;
  }
  for (const row of (data as Array<{ user_id: string; phone: string | null }>) || []) {
    if (row.phone) phones.set(row.user_id, row.phone);
  }
  return phones;
}

/**
 * Renseigne `phone` sur des personnes déjà chargées (vendeur, acheteur…),
 * pour que les écrans continuent de lire `seller.phone` comme avant.
 */
export async function attachContactPhones<T extends { id?: string | null; phone?: string | null }>(
  people: Array<T | null | undefined>
): Promise<void> {
  const present = people.filter((p): p is T => Boolean(p && p.id));
  if (present.length === 0) return;
  const phones = await fetchContactPhones(present.map((p) => p.id));
  for (const person of present) {
    person.phone = phones.get(person.id as string) ?? null;
  }
}
