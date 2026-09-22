/**
 * Algorithmes de vélocité de tendance et curation de flux pour DaloaMarket Web.
 */

import type { ListingEntity, ScoredListing } from './recommendationEngine';

export interface FeedListingCandidate {
  id: string;
  user_id?: string;
  listing_user_id?: string;
  view_count?: number;
  created_at?: string;
  sort_at?: string;
  boosted_until?: string | null;
  stock?: number;
}

/**
 * Calcule le score de tendance (Trending Velocity).
 * Formule basée sur la vélocité d'engagement pondérée par la décroissance temporelle (Gravity Decay).
 *
 * Score = (views + 2) / (ageDays + 2)^1.3 * (isBoosted ? 1.25 : 1.0)
 */
export function computeTrendingScore(listing: FeedListingCandidate): number {
  const views = Math.max(0, listing.view_count || 0);

  // Date de publication ou de dernier bump
  const dateStr = listing.sort_at || listing.created_at;
  const ageMs = dateStr ? Math.max(0, Date.now() - new Date(dateStr).getTime()) : 0;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  // Décroissance par gravité : évite que les vieilles annonces avec beaucoup de vues restent figées
  const gravity = Math.pow(ageDays + 2, 1.3);
  const baseScore = (views + 2) / gravity;

  // Boost actif : multiplicateur incitatif
  const isBoosted = listing.boosted_until ? new Date(listing.boosted_until) > new Date() : false;
  const boostMultiplier = isBoosted ? 1.25 : 1.0;

  return baseScore * boostMultiplier;
}

/**
 * Sélectionne les annonces les plus tendances pour la section "Populaire à Daloa".
 * Applique une diversité vendeurs (max 2 annonces par vendeur dans la sélection).
 */
export function getTrendingRecommendations<T extends ListingEntity>(
  listings: T[],
  limit = 4
): ScoredListing<T>[] {
  const available = listings.filter((l) => l.stock === undefined || l.stock > 0);

  const scored = available.map((item) => {
    const rawVelocity = computeTrendingScore(item as unknown as FeedListingCandidate);
    const isBoosted = item.boosted_until ? new Date(item.boosted_until) > new Date() : false;
    const normalizedScore = Math.min(99, Math.max(30, Math.round(rawVelocity * 15)));

    const scoredEntry: ScoredListing<T> = {
      item,
      score: normalizedScore,
      similarityPercent: normalizedScore,
      matchReason: isBoosted ? 'En vedette' : 'Populaire à Daloa',
      breakdown: {
        textScore: 50,
        priceScore: 50,
        categoryScore: 50,
        locationScore: 50,
        conditionScore: 50,
        recencyScore: normalizedScore,
      },
    };
    return scoredEntry;
  });

  scored.sort((a, b) => b.score - a.score);

  const out: ScoredListing<T>[] = [];
  const sellerCounts = new Map<string, number>();

  for (const entry of scored) {
    if (out.length >= limit) break;
    const sellerId = entry.item.user_id || entry.item.listing_user_id || 'unknown';
    const current = sellerCounts.get(sellerId) || 0;
    if (current >= 2) continue;
    sellerCounts.set(sellerId, current + 1);
    out.push(entry);
  }

  // Compléter si la diversité a réduit en dessous du limit
  if (out.length < limit) {
    const includedIds = new Set(out.map((o) => o.item.id));
    for (const entry of scored) {
      if (out.length >= limit) break;
      if (!includedIds.has(entry.item.id)) {
        out.push(entry);
      }
    }
  }

  return out;
}
