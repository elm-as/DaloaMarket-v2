/**
 * UUID v4. `order_items.variant_id` est de type uuid en base : un identifiant
 * de variante d'une autre forme (« variant_… ») fait échouer la commande, sur
 * le site comme dans l'app. `crypto.randomUUID` manque sur de vieux
 * navigateurs Android : repli sur `getRandomValues`, puis sur Math.random.
 */
export function generateUuidV4(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') {
    try {
      return c.randomUUID();
    } catch {
      /* contexte non sécurisé : on continue */
    }
  }
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Garde un identifiant s'il est déjà un UUID, sinon en fabrique un. */
export const ensureUuid = (id: unknown): string =>
  typeof id === 'string' && UUID_RE.test(id) ? id : generateUuidV4();
