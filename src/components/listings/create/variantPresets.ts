import type { ListingVariant } from '../../../types/listing';
import { generateUuidV4 } from '../../../lib/uuid';

export interface PresetColor {
  name: string;
  code: string;
  border: boolean;
}

export const PRESET_COLORS: PresetColor[] = [
  { name: 'Noir', code: '#111827', border: false },
  { name: 'Blanc', code: '#FFFFFF', border: true },
  { name: 'Gris', code: '#6B7280', border: false },
  { name: 'Bleu', code: '#3B82F6', border: false },
  { name: 'Rouge', code: '#EF4444', border: false },
  { name: 'Vert', code: '#10B981', border: false },
  { name: 'Jaune', code: '#F59E0B', border: false },
  { name: 'Rose', code: '#EC4899', border: false },
  { name: 'Marron', code: '#78350F', border: false },
  { name: 'Beige', code: '#D6C7B2', border: true },
  { name: 'Orange', code: '#F97316', border: false },
  { name: 'Multicolore', code: '#EA580C', border: false },
];

export const PRESET_CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Unique'];
export const PRESET_SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
export const PRESET_STORAGE_SIZES = ['64 Go', '128 Go', '256 Go', '512 Go', '1 To'];

export type VariantDrawerTab = 'clothing_size' | 'shoe_size' | 'color' | 'combo' | 'custom';

/**
 * Retourne l'onglet d'options le plus pertinent selon la catégorie de l'annonce.
 */
export function getRecommendedVariantTab(category?: string): VariantDrawerTab {
  if (category === 'fashion' || category === 'sports') return 'clothing_size';
  if (category === 'electronics') return 'custom';
  return 'color';
}

export interface BuildCombinationsParams {
  colors: PresetColor[];
  sizes: string[];
  stockPerVariant: number;
  priceOverride: number | null;
}

/**
 * Construit les déclinaisons unitaires ou combinées (Couleur · Taille/Pointure) sans effets de bord.
 * Si un seul axe est sélectionné, génère des options simples pour cet axe.
 */
export function buildVariantCombinations({
  colors,
  sizes,
  stockPerVariant,
  priceOverride,
}: BuildCombinationsParams): ListingVariant[] {
  const safeStock = Math.max(1, Math.round(stockPerVariant) || 1);
  const safePrice = priceOverride != null && priceOverride >= 300 ? priceOverride : null;

  if (colors.length > 0 && sizes.length > 0) {
    return colors.flatMap((color) =>
      sizes.map((size) => ({
        id: generateUuidV4(),
        label: `${color.name} · ${size}`,
        color: color.name,
        color_code: color.code,
        size,
        price: safePrice,
        stock: safeStock,
        active: true,
      }))
    );
  }

  if (colors.length > 0) {
    return colors.map((color) => ({
      id: generateUuidV4(),
      label: color.name,
      color: color.name,
      color_code: color.code,
      size: null,
      price: safePrice,
      stock: safeStock,
      active: true,
    }));
  }

  return sizes.map((size) => ({
    id: generateUuidV4(),
    label: size,
    color: null,
    color_code: null,
    size,
    price: safePrice,
    stock: safeStock,
    active: true,
  }));
}

/**
 * Fusionne de nouvelles variantes dans la liste existante sans dupliquer les libellés.
 */
export function mergeUniqueVariants(
  existing: ListingVariant[],
  incoming: ListingVariant[]
): ListingVariant[] {
  const seen = new Set(existing.map((v) => v.label.trim().toLowerCase()));
  const additions = incoming.filter((v) => {
    const key = v.label.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...existing, ...additions];
}
