/**
 * Moteur de Recherche Intelligent avec Tolérance aux Fautes & Synonymes pour DaloaMarket
 * 
 * Règles d'or :
 * 1. Une marque (Xiaomi, iPhone, Samsung...) ne s'étend JAMAIS aux termes génériques (telephone, smartphone).
 * 2. Un terme générique (téléphone, moto, frigo) s'étend à ses synonymes directs.
 * 3. Filtrage strict : Les articles sans AUCUN rapport avec la recherche sont totalement exclus.
 * 4. Classement par pertinence : Titre exact > Sous-marque > Description > Récence.
 */

// Dictionnaire strict des synonymes (sans contamination inter-marques)
export const SYNONYM_MAP: Record<string, string[]> = {
  // Marques et Modèles de Téléphones (Uniquement variantes directes)
  iphone: ['apple', 'ios'],
  apple: ['iphone', 'macbook', 'ipad', 'airpods'],
  samsung: ['galaxy'],
  galaxy: ['samsung'],
  xiaomi: ['redmi', 'poco'],
  redmi: ['xiaomi'],
  poco: ['xiaomi'],
  tecno: ['camon', 'spark', 'pova'],
  infinix: ['hot', 'note', 'zero'],
  airpods: ['ecouteurs', 'oreillettes'],
  ecouteurs: ['airpods', 'oreillettes', 'casque'],
  chargeur: ['cable', 'adaptateur', 'type-c', 'lightning'],

  // Termes génériques Téléphonie
  telephone: ['smartphone', 'portable', 'mobile', 'tel', 'cellulaire'],
  smartphone: ['telephone', 'portable', 'mobile', 'tel'],
  tel: ['telephone', 'smartphone', 'portable', 'mobile'],
  portable: ['telephone', 'smartphone', 'ordinateur', 'laptop'],

  // Informatique
  ordinateur: ['pc', 'laptop', 'ordi', 'macbook', 'informatique'],
  pc: ['ordinateur', 'laptop', 'ordi', 'macbook', 'desktop'],
  ordi: ['ordinateur', 'pc', 'laptop'],
  laptop: ['ordinateur', 'pc', 'ordi', 'macbook', 'portable'],
  macbook: ['apple', 'ordinateur', 'laptop'],
  tablette: ['ipad', 'tab'],
  ipad: ['tablette', 'apple'],

  // Véhicules & Deux-roues
  moto: ['jakarta', 'scooter', 'deux-roues', 'engin', 'ktm', 'yamaha', 'apsonic', 'royal', 'dayang'],
  jakarta: ['moto', 'scooter', 'deux-roues'],
  scooter: ['moto', 'jakarta', 'deux-roues'],
  voiture: ['vehicule', 'auto', 'automobile'],
  auto: ['voiture', 'vehicule', 'automobile'],
  vehicule: ['voiture', 'moto', 'auto', 'engin'],
  casque: ['protection', 'moto'],

  // Maison & Électroménager
  frigo: ['refrigerateur', 'congelateur', 'congelo'],
  refrigerateur: ['frigo', 'congelateur'],
  congelateur: ['congelo', 'frigo', 'refrigerateur'],
  congelo: ['congelateur', 'frigo'],
  tv: ['television', 'smart-tv', 'ecran', 'plasma', 'led'],
  television: ['tv', 'smart-tv', 'ecran', 'plasma'],
  gaz: ['bouteille', 'gaziniere', 'cuisiniere', 'rechaud'],
  cuisiniere: ['gaziniere', 'rechaud', 'four', 'gaz'],
  gaziniere: ['cuisiniere', 'rechaud', 'four', 'gaz'],
  ventilateur: ['ventilo', 'climatiseur', 'clim'],
  ventilo: ['ventilateur', 'clim'],
  clim: ['climatiseur', 'ventilateur', 'split'],
  climatiseur: ['clim', 'split', 'ventilateur'],
  matelas: ['lit', 'sommier', 'mousse'],
  lit: ['matelas', 'sommier', 'meuble'],
  fauteuil: ['salon', 'canape', 'meuble'],
  canape: ['fauteuil', 'salon', 'meuble'],
  salon: ['canape', 'fauteuil', 'meuble'],

  // Mode & Chaussures
  vetement: ['habits', 'habit', 'fringues', 'chemise', 'pantalon', 'robe', 't-shirt'],
  habits: ['vetement', 'habit', 'fringues', 'mode'],
  habit: ['vetement', 'habits', 'fringues'],
  fringues: ['vetement', 'habits'],
  chaussure: ['chaussures', 'sneakers', 'baskets', 'basket', 'claquettes', 'sandales', 'talons', 'tapettes'],
  chaussures: ['chaussure', 'sneakers', 'baskets', 'claquettes', 'sandales', 'talons'],
  basket: ['baskets', 'sneakers', 'chaussures', 'tennis'],
  baskets: ['basket', 'sneakers', 'chaussures'],
  sneakers: ['baskets', 'chaussures', 'basket'],
  claquettes: ['tapettes', 'sandales', 'chaussures'],
  tapettes: ['claquettes', 'sandales', 'chaussures'],
  robe: ['tenue', 'vetement', 'pagne'],
  pagne: ['tissu', 'wax', 'kita', 'robe'],
  sac: ['sacoche', 'maroquinerie', 'sac-a-main'],
  meches: ['perruque', 'cheveux', 'tissage'],
  perruque: ['meches', 'cheveux', 'tissage'],
  parfum: ['fragrance', 'eau-de-parfum'],
};

// Dictionnaire de corrections de fautes d'orthographe
export const SPELLING_CORRECTIONS: Record<string, string> = {
  // Téléphonie
  iphne: 'iphone',
  ipone: 'iphone',
  iphon: 'iphone',
  ayfon: 'iphone',
  ifon: 'iphone',
  aifon: 'iphone',
  ayphone: 'iphone',
  samsng: 'samsung',
  sansung: 'samsung',
  samson: 'samsung',
  sumsung: 'samsung',
  tekno: 'tecno',
  teknoo: 'tecno',
  infnix: 'infinix',
  infinx: 'infinix',
  xiomi: 'xiaomi',
  chaomi: 'xiaomi',
  xomi: 'xiaomi',
  airpod: 'airpods',
  earpod: 'airpods',
  erpods: 'airpods',
  ecouteur: 'ecouteurs',
  chargur: 'chargeur',
  telphone: 'telephone',
  telephon: 'telephone',
  smartphon: 'smartphone',
  smartfon: 'smartphone',

  // Véhicules & Motos
  jakata: 'jakarta',
  djakata: 'jakarta',
  djacarta: 'jakarta',
  jakarte: 'jakarta',
  jaccarta: 'jakarta',
  skooter: 'scooter',
  scotter: 'scooter',
  voitue: 'voiture',
  voitur: 'voiture',
  vehicul: 'vehicule',
  casq: 'casque',
  yamha: 'yamaha',
  apsonik: 'apsonic',

  // Informatique & Électronique
  ordinatur: 'ordinateur',
  ordinater: 'ordinateur',
  ordnateur: 'ordinateur',
  laptp: 'laptop',
  makbook: 'macbook',
  macbok: 'macbook',
  televison: 'television',
  televiseur: 'television',
  plasmat: 'plasma',

  // Maison & Électroménager
  frigidaire: 'frigo',
  frijo: 'frigo',
  congelatur: 'congelateur',
  congelater: 'congelateur',
  conjelateur: 'congelateur',
  conjelater: 'congelateur',
  gaznier: 'gaziniere',
  gaziniere: 'cuisiniere',
  cuisinier: 'cuisiniere',
  cuisiner: 'cuisiniere',
  ventilo: 'ventilateur',
  ventilater: 'ventilateur',
  climatisur: 'climatiseur',
  matla: 'matelas',
  matela: 'matelas',
  fotueil: 'fauteuil',
  fotoy: 'fauteuil',
  canap: 'canape',

  // Mode & Beauté
  chaussur: 'chaussures',
  chaussurs: 'chaussures',
  chosure: 'chaussures',
  chossure: 'chaussures',
  baskt: 'baskets',
  baskette: 'baskets',
  claqette: 'claquettes',
  claket: 'claquettes',
  clakette: 'claquettes',
  tapet: 'tapettes',
  vetment: 'vetement',
  vetements: 'vetement',
  perruk: 'perruque',
  perruqe: 'perruque',
  mech: 'meches',
  meche: 'meches',
  parfun: 'parfum',
};

/**
 * Distance de Levenshtein
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Normalise un terme
 */
export function cleanTerm(term: string): string {
  if (!term) return '';
  return term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Correction orthographique
 */
export function correctSingleWord(word: string): { corrected: string; wasCorrected: boolean } {
  const cleaned = cleanTerm(word);
  if (!cleaned || cleaned.length < 2) return { corrected: word, wasCorrected: false };

  if (SPELLING_CORRECTIONS[cleaned]) {
    return { corrected: SPELLING_CORRECTIONS[cleaned], wasCorrected: true };
  }

  if (SYNONYM_MAP[cleaned]) {
    return { corrected: cleaned, wasCorrected: false };
  }

  const allKnownTerms = Array.from(new Set([...Object.keys(SYNONYM_MAP), ...Object.values(SYNONYM_MAP).flat()]));
  let bestMatch = cleaned;
  let minDistance = Infinity;

  for (const candidate of allKnownTerms) {
    if (Math.abs(candidate.length - cleaned.length) > 2) continue;
    const dist = levenshteinDistance(cleaned, candidate);
    const maxAllowed = cleaned.length >= 5 ? 2 : 1;
    if (dist <= maxAllowed && dist < minDistance) {
      minDistance = dist;
      bestMatch = candidate;
    }
  }

  if (minDistance <= (cleaned.length >= 5 ? 2 : 1) && bestMatch !== cleaned) {
    return { corrected: bestMatch, wasCorrected: true };
  }

  return { corrected: word, wasCorrected: false };
}

export interface SmartSearchExpansion {
  originalQuery: string;
  correctedQuery: string;
  isCorrected: boolean;
  didYouMeanText: string | null;
  expandedTerms: string[];
  ftsQueryString: string;
  suggestedCategory: string | null;
}

/**
 * Analyse et prépare la recherche avec expansion contrôlée
 */
export function expandSmartSearch(rawQuery: string): SmartSearchExpansion {
  const originalQuery = rawQuery.trim();
  if (!originalQuery) {
    return {
      originalQuery: '',
      correctedQuery: '',
      isCorrected: false,
      didYouMeanText: null,
      expandedTerms: [],
      ftsQueryString: '',
      suggestedCategory: null,
    };
  }

  const rawWords = originalQuery.split(/\s+/).filter(Boolean);
  const correctedWords: string[] = [];
  let hasAnyCorrection = false;
  const wordExpansions: string[][] = [];

  for (const w of rawWords) {
    const { corrected, wasCorrected } = correctSingleWord(w);
    correctedWords.push(corrected);
    if (wasCorrected) hasAnyCorrection = true;

    const cleaned = cleanTerm(corrected);
    const synonyms = SYNONYM_MAP[cleaned] || [];
    const directGroup = [cleaned, ...synonyms.slice(0, 3)];
    wordExpansions.push(directGroup);
  }

  const correctedQuery = correctedWords.join(' ');
  const didYouMeanText = hasAnyCorrection ? correctedQuery : null;
  const expandedTerms = Array.from(new Set(wordExpansions.flat())).filter((t) => t.length >= 2);

  // Construction de la chaîne PostgreSQL FTS (compatible websearch)
  let ftsQueryString = originalQuery;
  if (rawWords.length === 1) {
    const singleGroup = wordExpansions[0] || [correctedQuery || originalQuery];
    ftsQueryString = singleGroup.slice(0, 3).join(' or ');
  } else {
    ftsQueryString = correctedWords.join(' ');
  }

  // Détection de catégorie
  let suggestedCategory: string | null = null;
  const mainTerm = cleanTerm(correctedWords[0] || '');
  if (['iphone', 'samsung', 'tecno', 'infinix', 'xiaomi', 'telephone', 'smartphone', 'tel', 'airpods', 'chargeur'].includes(mainTerm)) {
    suggestedCategory = 'electronics';
  } else if (['moto', 'jakarta', 'scooter', 'voiture', 'auto', 'casque', 'vehicule'].includes(mainTerm)) {
    suggestedCategory = 'vehicles';
  } else if (['frigo', 'refrigerateur', 'congelateur', 'tv', 'television', 'gaz', 'cuisiniere', 'ventilateur', 'matelas', 'salon'].includes(mainTerm)) {
    suggestedCategory = 'home';
  } else if (['vetement', 'habits', 'chaussures', 'baskets', 'claquettes', 'robe', 'pagne', 'meches', 'perruque', 'parfum'].includes(mainTerm)) {
    suggestedCategory = 'fashion';
  }

  return {
    originalQuery,
    correctedQuery,
    isCorrected: hasAnyCorrection,
    didYouMeanText,
    expandedTerms,
    ftsQueryString: ftsQueryString || originalQuery,
    suggestedCategory,
  };
}

/**
 * Classement et filtrage strict des résultats
 * Tout article sans correspondance avec la recherche est rejeté.
 */
export function rankFuzzySearchResults<T extends { title: string; description?: string | null; category?: string }>(
  items: T[],
  query: string
): T[] {
  if (!query || items.length === 0) return items;

  const expansion = expandSmartSearch(query);
  const primaryClean = cleanTerm(expansion.correctedQuery);
  const rawWords = expansion.correctedQuery.split(/\s+/).map(cleanTerm).filter(Boolean);

  const scoredItems: { item: T; score: number }[] = [];

  for (const item of items) {
    const score = calculateRelevance(item, primaryClean, rawWords, expansion);
    // Filtrage strict : seuls les articles avec un score positif sont retenus
    if (score > 0) {
      scoredItems.push({ item, score });
    }
  }

  // Tri par pertinence décroissante
  scoredItems.sort((a, b) => b.score - a.score);

  return scoredItems.map((s) => s.item);
}

function calculateRelevance(
  item: { title: string; description?: string | null; category?: string },
  primaryClean: string,
  rawWords: string[],
  expansion: SmartSearchExpansion
): number {
  let score = 0;
  const titleClean = cleanTerm(item.title);
  const descClean = cleanTerm(item.description || '');

  // 1. Correspondance exacte du titre avec la requête
  if (titleClean.includes(primaryClean)) {
    score += 100;
  }

  // 2. Correspondance des mots individuels dans le titre
  let matchedWordCount = 0;
  for (const w of rawWords) {
    if (titleClean.includes(w)) {
      matchedWordCount++;
      score += 40;
    } else if (descClean.includes(w)) {
      matchedWordCount += 0.5;
      score += 15;
    }
  }

  // 3. Correspondance des synonymes directs dans le titre
  for (const term of expansion.expandedTerms) {
    if (titleClean.includes(term)) {
      score += 20;
    }
  }

  // Si aucun mot ni synonyme ne matche le titre ou la description, score = 0 (article non pertinent)
  if (score === 0) return 0;

  // Si recherche multi-mots (ex: "iphone 13"), bonus si tous les mots sont présents
  if (rawWords.length > 1 && matchedWordCount >= rawWords.length) {
    score += 50;
  }

  return score;
}
