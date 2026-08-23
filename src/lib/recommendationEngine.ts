/**
 * Moteur de Recommandation & Similarité Machine Learning pour DaloaMarket
 * Implémente :
 * 1. Vectorisation textuelle TF-IDF & N-grams (TF-IDF + Cosine Similarity)
 * 2. Similarité de prix log-normale (Gaussian / Log-normal Price Distance)
 * 3. Similarité catégorielle hiérarchique avec synonymes
 * 4. Micro-clustering sémantique de produits (Garde-fou Téléphones vs TV vs Motos)
 * 5. Proximité géographique à Daloa (Quartiers limitrophes)
 * 6. Scoring composite multi-critères
 */

export interface ListingEntity {
  id: string;
  title: string;
  price: number;
  category: string;
  district?: string | null;
  condition?: string | null;
  photos?: string[];
  created_at?: string;
  stock?: number;
  boosted_until?: string | null;
  description?: string | null;
  [key: string]: any;
}

export interface ScoredListing<T = ListingEntity> {
  item: T;
  score: number; // 0 to 100
  similarityPercent: number; // 0 to 100
  matchReason: string;
  breakdown: {
    textScore: number;
    priceScore: number;
    categoryScore: number;
    locationScore: number;
    conditionScore: number;
    recencyScore: number;
  };
}

// Stop words français courants à ignorer pour la tokenisation
const FRENCH_STOP_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'l', 'a', 'à', 'au', 'aux',
  'en', 'dans', 'sur', 'sous', 'par', 'pour', 'avec', 'sans', 'et', 'ou', 'mais', 'donc',
  'or', 'ni', 'car', 'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 'son', 'notre', 'votre',
  'leur', 'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'se', 'sa',
  'ses', 'est', 'sont', 'suis', 'es', 'sommes', 'etes', 'êtes', 'etre', 'être', 'avoir',
  'tres', 'très', 'plus', 'moins', 'bien', 'bon', 'bonne', 'vends', 'vendre', 'vente',
  'achats', 'urgent', 'tres', 'quasi', 'neuf', 'etat', 'état', 'prix', 'fcfa', 'daloa',
]);

// Synonymes & connexions inter-catégories
const CATEGORY_GRAPH: Record<string, { related: string[]; weight: number }> = {
  electronics: { related: ['informatique', 'telephone', 'high-tech'], weight: 0.8 },
  fashion: { related: ['mode', 'chaussures', 'accessoires', 'beaute'], weight: 0.8 },
  vehicles: { related: ['auto', 'moto', 'pieces-detachees', 'deux-roues'], weight: 0.8 },
  home: { related: ['maison', 'electromenager', 'meubles', 'deco'], weight: 0.8 },
  sports: { related: ['loisirs', 'fitness', 'velo'], weight: 0.7 },
  books: { related: ['scolaire', 'culture', 'bureau'], weight: 0.7 },
  food: { related: ['alimentaire', 'produits-locaux', 'terroir'], weight: 0.8 },
};

// Quartiers de Daloa avec clusters géographiques pour affinité de proximité
const DISTRICT_CLUSTERS: Record<string, string[]> = {
  centre: ['commerce', 'grand marche', 'zone industrielle', 'marche central', 'administratif'],
  nord: ['tazibou', 'tazibou 1', 'tazibou 2', 'kennedy', 'kennedy 1', 'kennedy 2', 'abattoir', 'garage'],
  sud: ['lobia', 'labia', 'kirman', 'soleil', 'balouzon', 'bribouo', 'marais', 'zakoua', 'gbeuliville', 'zepreguhe'],
};

export type ProductCluster =
  | 'phone'
  | 'tv'
  | 'computer'
  | 'audio_accessory'
  | 'moto'
  | 'car'
  | 'appliance'
  | 'fashion'
  | 'furniture'
  | 'general';

/**
 * Détecte le type précis de produit (micro-cluster) pour éviter de mélanger des télévisions avec des smartphones
 */
export function detectProductCluster(title: string, category?: string): ProductCluster {
  const norm = normalizeText(title);

  if (/iphone|samsung|galaxy|tecno|infinix|xiaomi|redmi|poco|itel|smartphone|telephone\b/i.test(norm)) {
    if (/chargeur|cable|ecouteur|airpod|coque|pochette|verre|incassable|support/i.test(norm)) {
      return 'audio_accessory';
    }
    return 'phone';
  }

  if (/tv\b|television|smart tv|led|plasma|hisense|tcl|ecran/i.test(norm)) {
    return 'tv';
  }

  if (/ordinateur|pc\b|laptop|macbook|desktop|unite centrale|core i[0-9]|hp\b|dell\b|lenovo/i.test(norm)) {
    return 'computer';
  }

  if (/airpod|ecouteur|casque bluetooth|baffle|enceinte/i.test(norm)) {
    return 'audio_accessory';
  }

  if (/moto\b|jakarta|scooter|apsonic|ktm|yamaha|dayang|royal/i.test(norm)) {
    return 'moto';
  }

  if (/voiture|toyota|mercedes|peugeot|hyundai|kia/i.test(norm)) {
    return 'car';
  }

  if (/frigo|refrigerateur|congelateur|congelo|gaziniere|cuisiniere|climatiseur|clim\b|ventilateur|ventilo|four\b/i.test(norm)) {
    return 'appliance';
  }

  if (/robe|pantalon|chemise|chaussure|sneaker|basket|claquette|pagne|t-shirt|costume|sac\b|perruque/i.test(norm)) {
    return 'fashion';
  }

  if (/matelas|lit\b|fauteuil|canape|salon|armoire|buffet|table\b/i.test(norm)) {
    return 'furniture';
  }

  return 'general';
}

/**
 * Normalise et nettoie une chaîne textuelle
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Découpe un texte en tokens significatifs (1-grams et 2-grams)
 */
export function tokenizeText(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const rawWords = normalized.split(/\s+/).filter((w) => w.length >= 2 && !FRENCH_STOP_WORDS.has(w));
  const tokens: string[] = [...rawWords];

  for (let i = 0; i < rawWords.length - 1; i++) {
    tokens.push(`${rawWords[i]}_${rawWords[i + 1]}`);
  }

  return tokens;
}

/**
 * Calcule le vecteur de fréquence des termes (Term Frequency)
 */
export function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  if (tokens.length === 0) return tf;

  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }

  let sumSq = 0;
  for (const count of tf.values()) {
    sumSq += count * count;
  }
  const norm = Math.sqrt(sumSq) || 1;

  for (const [token, count] of tf.entries()) {
    tf.set(token, count / norm);
  }

  return tf;
}

/**
 * Calcule la similarité cosinus entre deux vecteurs textuels (TF)
 */
export function computeCosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  if (vecA.size === 0 || vecB.size === 0) return 0;

  let dotProduct = 0;
  const [smaller, larger] = vecA.size < vecB.size ? [vecA, vecB] : [vecB, vecA];

  for (const [term, valA] of smaller.entries()) {
    const valB = larger.get(term);
    if (valB !== undefined) {
      dotProduct += valA * valB;
    }
  }

  return Math.max(0, Math.min(1, dotProduct));
}

/**
 * Similarité de prix log-normale
 */
export function computePriceSimilarity(p1: number, p2: number, sigma: number = 0.45): number {
  if (p1 <= 0 || p2 <= 0) return 0.5;
  const logRatio = Math.log(p2) - Math.log(p1);
  const similarity = Math.exp(-(logRatio * logRatio) / (2 * sigma * sigma));
  return Math.max(0, Math.min(1, similarity));
}

/**
 * Similarité catégorielle
 */
export function computeCategorySimilarity(catA: string, catB: string): number {
  if (!catA || !catB) return 0.2;
  const cA = catA.toLowerCase().trim();
  const cB = catB.toLowerCase().trim();

  if (cA === cB) return 1.0;

  const graphA = CATEGORY_GRAPH[cA];
  if (graphA && graphA.related.includes(cB)) {
    return graphA.weight;
  }
  const graphB = CATEGORY_GRAPH[cB];
  if (graphB && graphB.related.includes(cA)) {
    return graphB.weight;
  }

  return 0.1;
}

/**
 * Similarité de localisation géographique à Daloa
 */
export function computeLocationSimilarity(locA?: string | null, locB?: string | null): number {
  if (!locA || !locB) return 0.5;
  const lA = normalizeText(locA);
  const lB = normalizeText(locB);

  if (lA === lB) return 1.0;

  for (const cluster of Object.values(DISTRICT_CLUSTERS)) {
    const hasA = cluster.some((d) => lA.includes(d));
    const hasB = cluster.some((d) => lB.includes(d));
    if (hasA && hasB) return 0.75;
  }

  return 0.4;
}

/**
 * Similarité d'état
 */
export function computeConditionSimilarity(condA?: string | null, condB?: string | null): number {
  if (!condA || !condB) return 0.7;
  const cA = condA.toLowerCase();
  const cB = condB.toLowerCase();
  if (cA === cB) return 1.0;
  return 0.5;
}

/**
 * Moteur principal de calcul de similarité Item-to-Item avec garde-fous sémantiques
 */
export function scoreItemSimilarity(
  source: ListingEntity,
  target: ListingEntity,
  sourceVec?: Map<string, number>
): ScoredListing {
  // 1. Détection des micro-clusters
  const srcCluster = detectProductCluster(source.title, source.category);
  const targetCluster = detectProductCluster(target.title, target.category);

  // Pénalité stricte en cas d'incompatibilité de type de produit (ex: Téléphone vs TV)
  let clusterMultiplier = 1.0;
  if (srcCluster !== 'general' && targetCluster !== 'general') {
    if (srcCluster === targetCluster) {
      clusterMultiplier = 1.15; // Bonus même famille de produit
    } else if (
      (srcCluster === 'phone' && targetCluster === 'audio_accessory') ||
      (srcCluster === 'audio_accessory' && targetCluster === 'phone') ||
      (srcCluster === 'computer' && targetCluster === 'audio_accessory')
    ) {
      clusterMultiplier = 0.75; // Accessoires acceptés mais avec score moindre
    } else {
      // Incompatible total (ex: Téléphone vs Télévision / Moto vs Robe)
      clusterMultiplier = 0.05;
    }
  }

  // 2. Text Similarity (Titre + Description)
  const srcVec = sourceVec || computeTF(tokenizeText(`${source.title} ${source.description || ''}`));
  const targetVec = computeTF(tokenizeText(`${target.title} ${target.description || ''}`));
  const textScore = computeCosineSimilarity(srcVec, targetVec);

  // 3. Price Similarity
  const priceScore = computePriceSimilarity(source.price, target.price);

  // 4. Category Similarity
  const categoryScore = computeCategorySimilarity(source.category, target.category);

  // 5. Location & Condition Similarity
  const locationScore = computeLocationSimilarity(source.district, target.district);
  const conditionScore = computeConditionSimilarity(source.condition, target.condition);

  // 6. Recency bonus
  let recencyScore = 0.5;
  if (target.created_at) {
    const ageDays = (Date.now() - new Date(target.created_at).getTime()) / (1000 * 60 * 60 * 24);
    recencyScore = Math.max(0.1, Math.min(1.0, 1.0 - ageDays / 60));
  }

  const weights = {
    category: 0.30,
    text: 0.35,
    price: 0.20,
    location: 0.08,
    condition: 0.04,
    recency: 0.03,
  };

  const rawScore =
    (categoryScore * weights.category +
      textScore * weights.text +
      priceScore * weights.price +
      locationScore * weights.location +
      conditionScore * weights.condition +
      recencyScore * weights.recency) * clusterMultiplier;

  const isBoosted = target.boosted_until && new Date(target.boosted_until) > new Date();
  const boostedMultiplier = isBoosted ? 1.08 : 1.0;

  const finalScore = Math.min(100, Math.round(rawScore * 100 * boostedMultiplier));

  let matchReason = 'Annonce similaire';
  if (textScore > 0.4 && priceScore > 0.8) {
    matchReason = 'Modèle similaire & même budget';
  } else if (textScore > 0.5) {
    matchReason = 'Article très similaire';
  } else if (categoryScore === 1.0 && priceScore > 0.85) {
    matchReason = 'Même catégorie & gamme de prix';
  } else if (categoryScore === 1.0) {
    matchReason = 'Dans la même catégorie';
  }

  return {
    item: target,
    score: finalScore,
    similarityPercent: finalScore,
    matchReason,
    breakdown: {
      textScore: Math.round(textScore * 100),
      priceScore: Math.round(priceScore * 100),
      categoryScore: Math.round(categoryScore * 100),
      locationScore: Math.round(locationScore * 100),
      conditionScore: Math.round(conditionScore * 100),
      recencyScore: Math.round(recencyScore * 100),
    },
  };
}

/**
 * Recherche et classe les annonces les plus similaires à une annonce donnée
 */
export function findSimilarListings<T extends ListingEntity>(
  source: ListingEntity,
  candidates: T[],
  options: {
    limit?: number;
    minScore?: number;
    excludeIds?: string[];
  } = {}
): ScoredListing<T>[] {
  const { limit = 4, minScore = 25, excludeIds = [] } = options;
  const excludeSet = new Set([source.id, ...excludeIds]);

  const sourceVec = computeTF(tokenizeText(`${source.title} ${source.description || ''}`));
  const scoredList: ScoredListing<T>[] = [];

  for (const candidate of candidates) {
    if (excludeSet.has(candidate.id)) continue;
    if (candidate.stock !== undefined && candidate.stock <= 0) continue;

    const scored = scoreItemSimilarity(source, candidate, sourceVec) as ScoredListing<T>;
    if (scored.score >= minScore) {
      scoredList.push(scored);
    }
  }

  scoredList.sort((a, b) => b.score - a.score);

  return scoredList.slice(0, limit);
}
