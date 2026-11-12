import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_PAYMENT_API_URL || 'https://api.daloamarket.com';

export interface ListingEngagementSignals {
  recentViewers7d: number;
  favoritesCount: number;
  stock: number;
  priceDropAmount: number;
  promoEndsAt: string | null;
}

export interface MarketplaceProofStats {
  totalMembers: number;
  activeListings: number;
  newListings7d: number;
  activePromos: number;
  verifiedReviews: number;
}

/**
 * Récupère les signaux réels d'engagement d'une annonce (vues uniques 7j hors vendeur,
 * favoris, stock, baisse de prix) depuis le serveur DaloaMarket.
 * Retourne des valeurs neutres en cas d'indisponibilité réseau.
 */
export async function fetchListingEngagementSignals(
  listingId: string
): Promise<ListingEngagementSignals> {
  const fallback: ListingEngagementSignals = {
    recentViewers7d: 0,
    favoritesCount: 0,
    stock: 1,
    priceDropAmount: 0,
    promoEndsAt: null,
  };
  if (!listingId) return fallback;

  try {
    const res = await fetch(`${API_BASE_URL}/api/engagement/listing/${encodeURIComponent(listingId)}`);
    if (!res.ok) return fallback;
    const data = await res.json();
    return {
      recentViewers7d: Number(data?.recentViewers7d || 0),
      favoritesCount: Number(data?.favoritesCount || 0),
      stock: Number(data?.stock ?? 1),
      priceDropAmount: Number(data?.priceDropAmount || 0),
      promoEndsAt: data?.promoEndsAt || null,
    };
  } catch {
    return fallback;
  }
}

/**
 * Récupère les statistiques communautaires réelles de DaloaMarket
 * (membres inscrits, annonces actives, nouveautés 7j, promotions en cours).
 */
export async function fetchMarketplaceProofStats(): Promise<MarketplaceProofStats | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/engagement/marketplace-stats`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      totalMembers: Number(data?.totalMembers || 0),
      activeListings: Number(data?.activeListings || 0),
      newListings7d: Number(data?.newListings7d || 0),
      activePromos: Number(data?.activePromos || 0),
      verifiedReviews: Number(data?.verifiedReviews || 0),
    };
  } catch {
    return null;
  }
}

/**
 * Déclenche manuellement une passe des relances comportementales automatiques (Admin).
 */
export async function triggerBehavioralNudges(dryRun = false): Promise<{
  ok: boolean;
  stats?: { reviewNudgesSent: number; priceDropNudgesSent: number; lowStockNudgesSent: number };
  skippedReason?: string | null;
  error?: string;
}> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { ok: false, error: 'Session expirée' };

    const res = await fetch(`${API_BASE_URL}/api/engagement/run-nudges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ dryRun }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json?.error || `HTTP ${res.status}` };
    return json;
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erreur réseau' };
  }
}

