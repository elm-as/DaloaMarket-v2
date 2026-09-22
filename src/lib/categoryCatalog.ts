/**
 * Catalogue des catégories DaloaMarket.
 *
 * Source unique de vérité pour :
 * - la résolution slug -> catégorie (routes SEO françaises + alias anglais),
 * - le libellé et la description SEO de chaque catégorie,
 * - l'URL canonique de la page catégorie.
 *
 * Les identifiants (`id`) sont ceux stockés dans `listings.category`.
 */

export interface CategoryConfig {
  /** Valeur stockée dans listings.category */
  id: string;
  /** Slug canonique utilisé dans l'URL publique */
  slug: string;
  /** Libellé complet */
  label: string;
  /** Libellé court pour l'arborescence latérale */
  short: string;
  /** Description SEO */
  description: string;
}

export const CATEGORY_CATALOG: CategoryConfig[] = [
  {
    id: 'electronics',
    slug: 'electronique',
    label: 'Électronique & High-tech',
    short: 'Électronique',
    description:
      'Achetez et vendez des téléphones, ordinateurs, téléviseurs et accessoires high-tech à Daloa sur DaloaMarket.',
  },
  {
    id: 'home',
    slug: 'maison-deco',
    label: 'Maison & Jardin',
    short: 'Maison & Jardin',
    description: 'Meubles, électroménager, décoration et articles de maison à Daloa.',
  },
  {
    id: 'fashion',
    slug: 'mode',
    label: 'Mode & Accessoires',
    short: 'Mode',
    description: 'Vêtements, chaussures, sacs, bijoux et accessoires de mode à Daloa.',
  },
  {
    id: 'beauty',
    slug: 'cosmetiques',
    label: 'Beauté & Cosmétiques',
    short: 'Beauté',
    description:
      'Crèmes, soins du visage et du corps, cheveux, perruques, maquillage et parfums à Daloa.',
  },
  {
    id: 'vehicles',
    slug: 'vehicules',
    label: 'Auto & Moto',
    short: 'Auto & Moto',
    description: 'Voitures, motos, pièces détachées et accessoires auto/moto à vendre à Daloa.',
  },
  {
    id: 'sports',
    slug: 'sports-loisirs',
    label: 'Sports & Loisirs',
    short: 'Sports',
    description: 'Équipements sportifs, vélos, jeux et articles de loisirs à Daloa.',
  },
  {
    id: 'books',
    slug: 'livres',
    label: 'Livres & Culture',
    short: 'Livres',
    description: 'Livres scolaires, romans, fournitures et matériel culturel à Daloa.',
  },
  {
    id: 'food',
    slug: 'alimentaire',
    label: 'Alimentaire & Produits locaux',
    short: 'Alimentaire',
    description: 'Produits vivriers, épicerie et spécialités locales à Daloa.',
  },
];

/**
 * Slugs alternatifs acceptés en entrée (anciens liens, variantes anglaises).
 * Clé = slug reçu, valeur = id de catégorie.
 */
const SLUG_ALIASES: Record<string, string> = {
  electronics: 'electronics',
  home: 'home',
  fashion: 'fashion',
  beauty: 'beauty',
  beaute: 'beauty',
  vehicles: 'vehicles',
  sports: 'sports',
  books: 'books',
  food: 'food',
};

const BY_SLUG = new Map<string, CategoryConfig>();
const BY_ID = new Map<string, CategoryConfig>();

for (const category of CATEGORY_CATALOG) {
  BY_SLUG.set(category.slug, category);
  BY_ID.set(category.id, category);
}

for (const [alias, id] of Object.entries(SLUG_ALIASES)) {
  const category = BY_ID.get(id);
  if (category) BY_SLUG.set(alias, category);
}

/** Résout un slug d'URL (canonique ou alias) vers sa configuration. */
export function resolveCategorySlug(slug: string): CategoryConfig | undefined {
  return BY_SLUG.get((slug || '').toLowerCase());
}

/** Résout un id `listings.category` vers sa configuration. */
export function getCategoryById(id: string): CategoryConfig | undefined {
  return BY_ID.get(id);
}

/** URL publique canonique d'une catégorie. */
export function getCategoryUrl(category: CategoryConfig): string {
  return `https://daloamarket.com/${category.slug}`;
}

/** Chemin interne de navigation vers une catégorie. */
export function getCategoryPath(category: CategoryConfig): string {
  return `/${category.slug}`;
}
