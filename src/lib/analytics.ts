import { supabase, isSupabaseConfigured } from './supabase';

/** Retourne un identifiant stable pour les visiteurs anonymes (persisté en localStorage). */
function getAnonymousViewerId(): string {
  const key = 'dm_viewer_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'anon_' + crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

/** Événement Facebook Pixel: CompleteRegistration (Inscription / Profil complété). */
export function trackCompleteRegistration(params?: Record<string, any>): void {
  try {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'CompleteRegistration', params);
    }
  } catch (err) {
    console.error('FB Pixel error:', err);
  }
}

/** Événement personnalisé / standard Facebook Pixel. */
export function trackFbEvent(eventName: string, params?: Record<string, any>): void {
  try {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', eventName, params);
    }
  } catch (err) {
    console.error('FB Pixel error:', err);
  }
}

/** Incrémente le compteur de vues d'une annonce (unique par viewer/24h, exclut le propriétaire). */
export async function incrementListingViews(listingId: string, userId?: string | null): Promise<void> {
  if (!isSupabaseConfigured) return;

  const viewerId = userId || getAnonymousViewerId();

  try {
    await supabase.rpc('increment_listing_views', {
      p_listing_id: listingId,
      p_viewer_id: viewerId,
    });
  } catch (error) {
    console.error('View counter error:', error);
  }
}
