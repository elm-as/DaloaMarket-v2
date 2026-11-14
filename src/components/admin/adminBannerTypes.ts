export interface BannerFormData {
  id?: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  badge_text: string | null;
  badge_color: string | null;
  link_type: 'express' | 'referral' | 'listing' | 'seller' | 'external' | 'none' | string;
  link_target: string | null;
  seller_id?: string | null;
  sponsor_name: string | null;
  price_paid: number;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export const BANNER_COLOR_PRESETS = [
  { label: 'Orange', value: '#EA580C' },
  { label: 'Rouge Flash', value: '#DC2626' },
  { label: 'Vert', value: '#16A34A' },
  { label: 'Bleu', value: '#2563EB' },
  { label: 'Violet Pro', value: '#7C3AED' },
] as const;

export const BANNER_DURATION_PACKS = [
  { days: 7, price: 3000, label: 'Pack 7J' },
  { days: 14, price: 5000, label: 'Pack 14J' },
  { days: 30, price: 10000, label: 'Pack 30J' },
] as const;

export const BANNER_LINK_TYPES: {
  value: BannerFormData['link_type'];
  label: string;
  placeholder: string;
}[] = [
  { value: 'express', label: 'Coursier Express (Course interne)', placeholder: 'Automatique (/express)' },
  { value: 'none', label: 'Page interne / Packs Boost', placeholder: 'Ex: /acheter-pack' },
  { value: 'listing', label: 'Annonce spécifique (ID)', placeholder: 'Ex: e2b4f981-...' },
  { value: 'seller', label: 'Boutique vendeur (ID)', placeholder: 'Ex: 9c011bfa-...' },
  { value: 'external', label: 'Lien Web externe', placeholder: 'Ex: https://...' },
];

/**
 * Initialise les champs d'édition d'une affiche carrousel avec des valeurs sûres.
 */
export function buildInitialBannerForm(banner?: BannerFormData | null): BannerFormData {
  if (!banner) {
    return {
      title: '',
      subtitle: '',
      image_url: '',
      badge_text: '🔥 VENTE FLASH',
      badge_color: '#DC2626',
      link_type: 'listing',
      link_target: '',
      sponsor_name: '',
      price_paid: 0,
      priority: 5,
      starts_at: new Date().toISOString(),
      ends_at: null,
      is_active: true,
    };
  }
  return {
    ...banner,
    subtitle: banner.subtitle || '',
    badge_text: banner.badge_text || '',
    badge_color: banner.badge_color || '#EA580C',
    link_target: banner.link_target || '',
    sponsor_name: banner.sponsor_name || '',
    starts_at: banner.starts_at || new Date().toISOString(),
    ends_at: banner.ends_at || null,
  };
}

export function toLocalDateInput(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}
