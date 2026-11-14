export interface WebPromoBanner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  badge_text: string | null;
  badge_color: string | null;
  sponsor_name?: string | null;
  link_type: 'express' | 'referral' | 'listing' | 'seller' | 'external' | 'none';
  link_target: string | null;
  is_active: boolean;
  priority: number;
}

export const DEFAULT_BANNERS: WebPromoBanner[] = [
  {
    id: 'default-express',
    title: 'Coursier Express Daloa',
    subtitle: 'Envoi direct de colis, plis et repas entre quartiers dès 500 FCFA',
    image_url: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=900&q=80',
    badge_text: 'EXPRESS · DÈS 500 F',
    badge_color: '#EA580C',
    sponsor_name: 'DaloaDelivery',
    link_type: 'express',
    link_target: null,
    is_active: true,
    priority: 10,
  },
  {
    id: 'default-boost',
    title: 'Vendez 3x plus vite à Daloa',
    subtitle: 'Placez vos articles en tête des recherches ou passez Vendeur Pro vérifié',
    image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80',
    badge_text: 'VISIBILITÉ N°1',
    badge_color: '#D97706',
    sponsor_name: 'DaloaMarket Pro',
    link_type: 'none',
    link_target: '/acheter-pack',
    is_active: true,
    priority: 5,
  },
];

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const AUTO_ADVANCE_MS = 9000;

/**
 * Fait glisser horizontalement un conteneur scrollable sans conflit avec
 * scroll-snap ni scroll-behavior CSS, avec courbe sinusoïdale progressive.
 */
export function glideTrackHorizontally(params: {
  track: HTMLElement;
  targetLeft: number;
  durationMs: number;
  onFrameHandle: (rafId: number | null) => void;
  onComplete: () => void;
}): void {
  const { track, targetLeft, durationMs, onFrameHandle, onComplete } = params;
  const maxLeft = Math.max(0, track.scrollWidth - track.clientWidth);
  const clampedTarget = Math.max(0, Math.min(targetLeft, maxLeft));
  const startLeft = track.scrollLeft;
  const distance = clampedTarget - startLeft;
  const prefersReduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (Math.abs(distance) < 2 || prefersReduced) {
    track.scrollLeft = clampedTarget;
    onFrameHandle(null);
    onComplete();
    return;
  }

  track.style.scrollSnapType = 'none';
  track.style.scrollBehavior = 'auto';
  const startedAt = performance.now();

  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / durationMs);
    const eased = -(Math.cos(Math.PI * progress) - 1) / 2;

    track.scrollLeft = startLeft + distance * eased;

    if (progress < 1) {
      onFrameHandle(window.requestAnimationFrame(step));
      return;
    }

    track.scrollLeft = clampedTarget;
    onFrameHandle(null);
    onComplete();
  };

  onFrameHandle(window.requestAnimationFrame(step));
}

/**
 * Vérifie si une affiche active se trouve dans sa fenêtre de diffusion planifiée.
 * Les dates courtes (YYYY-MM-DD) sont étendues à la fin de journée UTC.
 */
export function isBannerWithinSchedule(startsAt?: string | null, endsAt?: string | null): boolean {
  const now = Date.now();
  if (startsAt) {
    const startMs = Date.parse(startsAt);
    if (Number.isFinite(startMs) && startMs > now) return false;
  }
  if (endsAt) {
    const normalizedEnd = /^\d{4}-\d{2}-\d{2}$/.test(endsAt) ? `${endsAt}T23:59:59.999Z` : endsAt;
    const endMs = Date.parse(normalizedEnd);
    if (Number.isFinite(endMs) && endMs < now) return false;
  }
  return true;
}

/**
 * Complète une affiche unique par une affiche compagnon afin de préserver le défilement.
 */
export function resolveActiveBanners(valid: WebPromoBanner[]): WebPromoBanner[] {
  if (valid.length === 1) {
    const companion = DEFAULT_BANNERS.find((d) => d.link_type !== valid[0].link_type) ?? DEFAULT_BANNERS[1];
    return [valid[0], companion];
  }
  return valid.length > 1 ? valid : DEFAULT_BANNERS;
}

/**
 * Résout la destination interne ou externe associée au clic sur une affiche.
 */
export function resolveBannerAction(
  banner: WebPromoBanner,
  boostDestination: string,
): { externalUrl?: string; internalRoute?: string } {
  switch (banner.link_type) {
    case 'express':
      return { internalRoute: '/express' };
    case 'listing':
      return banner.link_target ? { internalRoute: `/listings/${banner.link_target}` } : {};
    case 'seller':
      return banner.link_target ? { internalRoute: `/boutique/${banner.link_target}` } : {};
    case 'external':
      return banner.link_target ? { externalUrl: banner.link_target } : {};
    default:
      if (banner.link_target === '/acheter-pack') return { internalRoute: boostDestination };
      return banner.link_target ? { internalRoute: banner.link_target } : {};
  }
}
