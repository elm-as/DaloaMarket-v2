import { supabase } from '../../../lib/supabase';
import type { ListingVariant } from '../../../types/listing';
import { ensureUuid } from '../../../lib/uuid';

export interface ListingFormValues {
  title: string;
  price: string;
  description: string;
  category: string;
  condition: string;
  district: string;
  phone: string;
  stock: string;
  original_price: string;
}

export const EMPTY_LISTING_FORM_VALUES: ListingFormValues = {
  title: '',
  price: '',
  description: '',
  category: '',
  condition: '',
  district: '',
  phone: '',
  stock: '1',
  original_price: '',
};

/**
 * Charge une annonce existante appartenant au vendeur et prépare ses valeurs
 * pour pré-remplir le formulaire d'édition.
 */
export async function fetchEditableListing(
  editId: string,
  userId: string,
  fallbackPhone: string,
): Promise<{
  values: ListingFormValues;
  variants: ListingVariant[];
  photos: string[];
} | null> {
  const { data, error } = await supabase.from('listings').select('*').eq('id', editId).single();
  if (error) throw error;
  if (data.user_id !== userId) return null;

  const loadedVariants = Array.isArray((data as any).variants) ? (data as any).variants : [];
  return {
    values: {
      title: data.title || '',
      price: data.price ? String(data.price) : '',
      description: data.description || '',
      category: data.category || '',
      condition: data.condition || '',
      district: data.district || '',
      phone: data.contact_phone || fallbackPhone,
      stock: data.stock != null ? String(data.stock) : '1',
      original_price: (data as any).original_price != null ? String((data as any).original_price) : '',
    },
    variants: loadedVariants.map((variant: any) => ({
      id: ensureUuid(variant.id),
      label: String(variant.label || ''),
      color: variant.color ? String(variant.color) : null,
      color_code: variant.color_code ? String(variant.color_code) : null,
      size: variant.size ? String(variant.size) : null,
      price: variant.price == null || variant.price === '' ? null : Number(variant.price),
      stock: Math.max(0, Number(variant.stock) || 0),
      active: variant.active !== false,
    })),
    photos: Array.isArray(data.photos) ? data.photos : [],
  };
}

export const WEB_WIZARD_STEPS = [
  { id: 1, label: 'Photos & Infos' },
  { id: 2, label: 'Prix & Options' },
  { id: 3, label: 'Description & Lieu' },
] as const;

export interface NormalizedListingVariant {
  id: string;
  label: string;
  color: string | null;
  color_code: string | null;
  size: string | null;
  price: number | null;
  stock: number;
  active: boolean;
}

/**
 * Normalise et valide les déclinaisons saisies par le vendeur avant enregistrement.
 */
export function normalizeCreateVariants(variants: ListingVariant[]): {
  normalized: NormalizedListingVariant[];
  errorMessage: string | null;
} {
  const normalized = variants.map((variant) => {
    const color = variant.color?.trim() || null;
    const color_code = variant.color_code?.trim() || null;
    const size = variant.size?.trim() || null;

    let label = (variant.label || '').trim();
    if (!label) {
      if (color && size) label = `${color} · ${size}`;
      else if (color) label = color;
      else if (size) label = size;
      else label = 'Option standard';
    }

    return {
      id: ensureUuid(variant.id),
      label,
      color,
      color_code,
      size,
      price:
        variant.price == null || Number.isNaN(Number(variant.price))
          ? null
          : Math.round(Number(variant.price)),
      stock: Math.max(0, Math.floor(Number(variant.stock) || 0)),
      active: variant.active !== false,
    };
  });

  if (normalized.some((v) => !v.label)) {
    return { normalized, errorMessage: 'Chaque option doit avoir un libellé.' };
  }
  if (normalized.some((v) => v.stock < 1 || (v.price != null && v.price < 300))) {
    return {
      normalized,
      errorMessage: 'Chaque option doit avoir un stock >= 1 et un prix >= 300 F.',
    };
  }
  return { normalized, errorMessage: null };
}

/**
 * Téléverse les nouvelles photos vers Supabase Storage et retourne leurs URL publiques.
 */
export async function uploadListingPhotos(
  userId: string,
  listingId: string,
  photos: File[],
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    const file = photos[i];
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/${listingId}/${Date.now()}_${i}.${ext}`;
    const { error } = await supabase.storage.from('listings').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('listings').getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

/**
 * Crée ou met à jour l'annonce en base de données avec ses photos et déclinaisons.
 */
export async function saveListingRecord(params: {
  editId: string | null;
  userId: string;
  listingId: string;
  values: ListingFormValues;
  finalPhotos: string[];
  normalizedVariants: NormalizedListingVariant[];
}): Promise<string> {
  const { editId, userId, listingId, values, finalPhotos, normalizedVariants } = params;
  const totalStock =
    normalizedVariants.length > 0
      ? normalizedVariants.reduce((sum, variant) => sum + variant.stock, 0)
      : Math.max(1, parseInt(values.stock, 10) || 1);

  const payload = {
    title: values.title.trim(),
    price: parseInt(values.price, 10),
    original_price: values.original_price ? parseInt(values.original_price, 10) : null,
    description: values.description.trim(),
    category: values.category,
    condition: values.condition,
    district: values.district,
    contact_phone: values.phone.trim(),
    stock: totalStock,
    variants: normalizedVariants,
    photos: finalPhotos,
  };

  if (editId) {
    const { error } = await supabase.from('listings').update(payload as any).eq('id', editId);
    if (error) throw error;
    return editId;
  }

  const { data, error } = await supabase
    .from('listings')
    .insert({ id: listingId, user_id: userId, status: 'active', ...payload } as any)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}
