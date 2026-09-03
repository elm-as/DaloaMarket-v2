/**
 * Service d'apprentissage comportemental et profilage utilisateur (Client & Edge)
 * Construit un profil de préférences dynamique basé sur les actions de l'utilisateur.
 */

import type {
  ListingEntity,
  ScoredListing,
} from '../lib/recommendationEngine';
import {
  computeTF,
  tokenizeText,
  computeCosineSimilarity,
  computePriceSimilarity,
  computeCategorySimilarity,
  computeLocationSimilarity,
  normalizeText,
} from '../lib/recommendationEngine';
import { supabase } from '../lib/supabase';

export type InteractionType = 'view' | 'click' | 'search' | 'favorite' | 'contact' | 'add_to_cart';

// Cache de l'utilisateur courant pour attribuer les events serveur sans I/O bloquant.
let cachedUserId: string | null = null;
if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    cachedUserId = data.session?.user?.id ?? null;
  });
  supabase.auth.onAuthStateChange((_e, session) => {
    cachedUserId = session?.user?.id ?? null;
  });
}

// Correspondance InteractionType -> nom d'event serveur (table `events`).
const EVENT_NAME_MAP: Record<InteractionType, string> = {
  view: 'listing_view',
  click: 'listing_click',
  search: 'search',
  favorite: 'favorite_add',
  contact: 'contact_seller',
  add_to_cart: 'add_to_cart',
};

export interface UserInteraction {
  type: InteractionType;
  listingId?: string;
  category?: string;
  price?: number;
  title?: string;
  district?: string;
  searchQuery?: string;
  timestamp: number;
}

export interface UserPreferenceProfile {
  categoryWeights: Record<string, number>; // category -> weight (0 to 1)
  averagePrice: number;
  priceVariance: number;
  topKeywords: string[];
  districtWeights: Record<string, number>;
  totalInteractions: number;
  lastActive: number;
}

const STORAGE_KEY = 'dm_user_interactions_v2';
const MAX_INTERACTIONS = 80;
const HALF_LIFE_DAYS = 7; // Demi-vie de décroissance temporelle (7 jours)

// Poids associés aux types d'interaction
const INTERACTION_WEIGHTS: Record<InteractionType, number> = {
  view: 1.0,
  click: 2.0,
  search: 3.0,
  add_to_cart: 4.5,
  favorite: 5.0,
  contact: 7.0,
};

class UserBehaviorService {
  private interactions: UserInteraction[] = [];
  private cachedProfile: UserPreferenceProfile | null = null;
  private profileDirty = true;

  constructor() {
    this.loadInteractions();
  }

  private loadInteractions() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.interactions = parsed.slice(-MAX_INTERACTIONS);
          this.profileDirty = true;
        }
      }
    } catch (e) {
      console.warn('Could not load user interactions from localStorage:', e);
      this.interactions = [];
    }
  }

  private saveInteractions() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.interactions.slice(-MAX_INTERACTIONS)));
    } catch (e) {
      console.warn('Could not save user interactions to localStorage:', e);
    }
  }

  /**
   * Enregistre une interaction utilisateur (vue, clic, recherche, favori...)
   */
  public trackInteraction(interaction: Omit<UserInteraction, 'timestamp'>) {
    const fullInteraction: UserInteraction = {
      ...interaction,
      timestamp: Date.now(),
    };

    // Éviter les doublons consécutifs immédiats (ex: multi-clics en < 1s)
    const last = this.interactions[this.interactions.length - 1];
    if (
      last &&
      last.type === fullInteraction.type &&
      last.listingId === fullInteraction.listingId &&
      Date.now() - last.timestamp < 2000
    ) {
      return;
    }

    this.interactions.push(fullInteraction);
    if (this.interactions.length > MAX_INTERACTIONS) {
      this.interactions.shift();
    }

    this.profileDirty = true;
    this.saveInteractions();

    // Persistance serveur (fire-and-forget) — graine pour le ML futur.
    this.logToServer(fullInteraction);
  }

  /**
   * Envoie l'interaction dans la table `events` côté serveur. Ne bloque jamais
   * l'UX et n'échoue jamais visiblement.
   */
  private logToServer(interaction: UserInteraction) {
    if (!supabase) return;
    const eventName = EVENT_NAME_MAP[interaction.type];
    if (!eventName) return;

    const { type, listingId, timestamp, ...rest } = interaction;
    void supabase
      .from('events')
      .insert({
        event_name: eventName,
        user_id: cachedUserId,
        listing_id: listingId ?? null,
        props: rest,
      })
      .then(({ error }: { error: unknown }) => {
        if (error && import.meta.env?.DEV) {
          console.warn('[analytics] event non enregistré:', eventName, error);
        }
      });
  }

  /**
   * Raccourci pour tracker une recherche textuelle
   */
  public trackSearch(query: string) {
    if (!query || query.trim().length < 2) return;
    this.trackInteraction({
      type: 'search',
      searchQuery: query.trim(),
    });
  }

  /**
   * Calcule le profil de préférences dynamiques avec décroissance temporelle exponentielle (Time Decay)
   */
  public getUserProfile(): UserPreferenceProfile {
    if (!this.profileDirty && this.cachedProfile) {
      return this.cachedProfile;
    }

    const now = Date.now();
    const catScores: Record<string, number> = {};
    const districtScores: Record<string, number> = {};
    const keywordScores: Record<string, number> = {};
    const priceWeights: { price: number; weight: number }[] = [];

    let totalWeightSum = 0;

    for (const action of this.interactions) {
      const ageDays = (now - action.timestamp) / (1000 * 60 * 60 * 24);
      // Décroissance exponentielle : weight = base * 2^(-age / halfLife)
      const timeDecay = Math.pow(2, -ageDays / HALF_LIFE_DAYS);
      const baseWeight = INTERACTION_WEIGHTS[action.type] || 1.0;
      const effectiveWeight = baseWeight * timeDecay;

      totalWeightSum += effectiveWeight;

      // 1. Catégorie
      if (action.category) {
        const cat = action.category.toLowerCase().trim();
        catScores[cat] = (catScores[cat] || 0) + effectiveWeight;
      }

      // 2. Quartier / District
      if (action.district) {
        const dist = action.district.toLowerCase().trim();
        districtScores[dist] = (districtScores[dist] || 0) + effectiveWeight;
      }

      // 3. Prix
      if (action.price && action.price > 0) {
        priceWeights.push({ price: action.price, weight: effectiveWeight });
      }

      // 4. Mots-clés & Termes de recherche
      const textToTokenize = `${action.title || ''} ${action.searchQuery || ''}`;
      if (textToTokenize.trim()) {
        const tokens = tokenizeText(textToTokenize);
        for (const token of tokens) {
          keywordScores[token] = (keywordScores[token] || 0) + effectiveWeight;
        }
      }
    }

    // Normalisation des catégories (somme = 1)
    const normalizedCats: Record<string, number> = {};
    let catSum = 0;
    for (const val of Object.values(catScores)) catSum += val;
    if (catSum > 0) {
      for (const [cat, score] of Object.entries(catScores)) {
        normalizedCats[cat] = score / catSum;
      }
    }

    // Normalisation des quartiers
    const normalizedDistricts: Record<string, number> = {};
    let distSum = 0;
    for (const val of Object.values(districtScores)) distSum += val;
    if (distSum > 0) {
      for (const [dist, score] of Object.entries(districtScores)) {
        normalizedDistricts[dist] = score / distSum;
      }
    }

    // Calcul moyenne pondérée du budget
    let avgPrice = 25000; // Prix par défaut moyen à Daloa
    let priceVar = 0.5;
    if (priceWeights.length > 0) {
      let weightedPriceSum = 0;
      let totalPWeight = 0;
      for (const item of priceWeights) {
        weightedPriceSum += item.price * item.weight;
        totalPWeight += item.weight;
      }
      if (totalPWeight > 0) {
        avgPrice = Math.round(weightedPriceSum / totalPWeight);
      }
    }

    // Top keywords triés
    const topKeywords = Object.entries(keywordScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([kw]) => kw);

    this.cachedProfile = {
      categoryWeights: normalizedCats,
      averagePrice: avgPrice,
      priceVariance: priceVar,
      topKeywords,
      districtWeights: normalizedDistricts,
      totalInteractions: this.interactions.length,
      lastActive: this.interactions.length > 0 ? this.interactions[this.interactions.length - 1].timestamp : now,
    };

    this.profileDirty = false;
    return this.cachedProfile;
  }

  /**
   * Moteur de scoring User-to-Item (Recommandations personnalisées pour l'utilisateur)
   */
  public getPersonalizedRecommendations<T extends ListingEntity>(
    candidates: T[],
    options: {
      limit?: number;
      minScore?: number;
      excludeIds?: string[];
    } = {}
  ): ScoredListing<T>[] {
    const { limit = 8, minScore = 25, excludeIds = [] } = options;
    const profile = this.getUserProfile();
    const excludeSet = new Set(excludeIds);

    // Si pas assez d'interactions historiques, recommander les annonces récentes & boostées
    const isColdStart = profile.totalInteractions < 2;

    // Vectoriser le profil textuel de l'utilisateur
    const profileText = profile.topKeywords.join(' ');
    const profileVec = computeTF(tokenizeText(profileText));

    const scoredList: ScoredListing<T>[] = [];

    for (const item of candidates) {
      if (excludeSet.has(item.id)) continue;
      if (item.stock !== undefined && item.stock <= 0) continue;

      if (isColdStart) {
        // Mode Découverte (Cold Start) : Favoriser la fraîcheur et les articles boostés
        let score = 50;
        if (item.boosted_until && new Date(item.boosted_until) > new Date()) score += 20;
        if (item.photos && item.photos.length > 0) score += 10;
        scoredList.push({
          item,
          score,
          similarityPercent: score,
          matchReason: 'Populaire à Daloa',
          breakdown: {
            textScore: 50,
            priceScore: 50,
            categoryScore: 50,
            locationScore: 50,
            conditionScore: 50,
            recencyScore: 50,
          },
        });
        continue;
      }

      // 1. Category Affinity (Poids le plus fort pour la personnalisation)
      const itemCat = (item.category || '').toLowerCase().trim();
      let categoryScore = profile.categoryWeights[itemCat] || 0;
      // Bonus partiel pour catégories connexes
      if (categoryScore === 0) {
        for (const [userCat, weight] of Object.entries(profile.categoryWeights)) {
          const sim = computeCategorySimilarity(userCat, itemCat);
          if (sim > 0.5) {
            categoryScore = Math.max(categoryScore, weight * sim);
          }
        }
      }

      // 2. Text / Keyword Similarity
      const itemVec = computeTF(tokenizeText(`${item.title} ${item.description || ''}`));
      const textScore = computeCosineSimilarity(profileVec, itemVec);

      // 3. Price Affinity (Log-normal distance to user's average interest budget)
      const priceScore = computePriceSimilarity(profile.averagePrice, item.price, 0.6);

      // 4. District Affinity
      const itemDist = normalizeText(item.district || '');
      let locationScore = 0.5;
      if (itemDist) {
        locationScore = profile.districtWeights[itemDist] ? 1.0 : 0.6;
      }

      // 5. Recency
      let recencyScore = 0.5;
      if (item.created_at) {
        const ageDays = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);
        recencyScore = Math.max(0.2, Math.min(1.0, 1.0 - ageDays / 45));
      }

      // Poids du scoring utilisateur
      const weights = {
        category: 0.35,
        text: 0.30,
        price: 0.20,
        location: 0.08,
        recency: 0.07,
      };

      const rawScore =
        categoryScore * weights.category +
        textScore * weights.text +
        priceScore * weights.price +
        locationScore * weights.location +
        recencyScore * weights.recency;

      const isBoosted = item.boosted_until && new Date(item.boosted_until) > new Date();
      const finalScore = Math.min(100, Math.round(rawScore * 100 * (isBoosted ? 1.08 : 1.0)));

      // Raison de personnalisation pour l'UI
      let matchReason = 'Recommandé pour vous';
      if (categoryScore > 0.4 && textScore > 0.3) {
        matchReason = 'Correspond à vos recherches';
      } else if (categoryScore > 0.5) {
        matchReason = 'Dans vos catégories favorites';
      } else if (priceScore > 0.85 && categoryScore > 0.2) {
        matchReason = 'Dans votre budget habituel';
      }

      if (finalScore >= minScore) {
        scoredList.push({
          item,
          score: finalScore,
          similarityPercent: finalScore,
          matchReason,
          breakdown: {
            textScore: Math.round(textScore * 100),
            priceScore: Math.round(priceScore * 100),
            categoryScore: Math.round(categoryScore * 100),
            locationScore: Math.round(locationScore * 100),
            conditionScore: 70,
            recencyScore: Math.round(recencyScore * 100),
          },
        });
      }
    }

    // Tri par score décroissant
    scoredList.sort((a, b) => b.score - a.score);

    return scoredList.slice(0, limit);
  }

  /**
   * Injecte les favoris Supabase dans l'historique local (persistance cross-device).
   * Evite les doublons et préserve les interactions comportementales déjà enregistrées.
   */
  public hydrateFavorites(favorites: ListingEntity[]): void {
    if (!favorites.length) return;

    const existingFavIds = new Set(
      this.interactions.filter((i) => i.type === 'favorite').map((i) => i.listingId)
    );

    let added = 0;
    for (const fav of favorites) {
      if (existingFavIds.has(fav.id)) continue;
      // Timestamp distribué sur les 30 derniers jours pour simuler l'historique réel
      const simulatedAge = Math.random() * 30 * 24 * 60 * 60 * 1000;
      this.interactions.push({
        type: 'favorite',
        listingId: fav.id,
        category: fav.category,
        price: fav.price,
        title: fav.title,
        district: fav.district ?? undefined,
        timestamp: Date.now() - simulatedAge,
      });
      added++;
    }

    if (added === 0) return;

    if (this.interactions.length > MAX_INTERACTIONS) {
      this.interactions = this.interactions
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-MAX_INTERACTIONS);
    }

    this.profileDirty = true;
    this.saveInteractions();
  }

  /**
   * Réinitialise l'historique et le profil de recommandations (Protection vie privée)
   */
  public clearHistory() {
    this.interactions = [];
    this.cachedProfile = null;
    this.profileDirty = true;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Could not clear interactions:', e);
    }
  }
}

export const userBehaviorService = new UserBehaviorService();
