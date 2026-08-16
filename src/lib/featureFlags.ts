// Feature flags
// Objectif: activer/désactiver des fonctionnalités sans supprimer le code.

const parseBoolean = (value: unknown, fallback: boolean) => {
	if (typeof value !== 'string') return fallback;
	const normalized = value.trim().toLowerCase();
	if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
	if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
	return fallback;
};

const parseInteger = (value: unknown, fallback: number) => {
	if (typeof value !== 'string') return fallback;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : fallback;
};

// --- Phase 0 : Monétisation désactivée (rétention prioritaire) ---
// Quand true, toutes les UI de monétisation sont masquées et les limites
// d'annonces sont levées. Le code reste intact pour réactivation future.
export const PHASE0_FREE_MODE = parseBoolean(
	import.meta.env.VITE_PHASE0_FREE_MODE,
	false
);

// Désactive temporairement le paiement pour publier des annonces.
export const BETA_DISABLE_LISTING_PAYMENTS = parseBoolean(
	import.meta.env.VITE_BETA_DISABLE_LISTING_PAYMENTS,
	true
);

// Limite de publications gratuites par compte (annonces actives).
// En Phase0, la limite est ignorée (publication illimitée pour tous).
export const MAX_FREE_LISTINGS = PHASE0_FREE_MODE
	? Number.POSITIVE_INFINITY
	: parseInteger(import.meta.env.VITE_MAX_FREE_LISTINGS, 20);

// --- Monétisation : visibilité & performance ---

// Boost : annonce en tête de liste + badge "Sponsorisé" (7 jours, 500 FCFA)
export const ENABLE_BOOST = PHASE0_FREE_MODE
	? false
	: parseBoolean(import.meta.env.VITE_ENABLE_BOOST, true);

// Bump : remonter une annonce en tête (remet la date, 200 FCFA)
export const ENABLE_BUMP = PHASE0_FREE_MODE
	? false
	: parseBoolean(import.meta.env.VITE_ENABLE_BUMP, true);

// Badge vendeur Pro : badge affiché sur annonces + profil (30 jours, 1000 FCFA)
export const ENABLE_SELLER_BADGE = PHASE0_FREE_MODE
	? false
	: parseBoolean(import.meta.env.VITE_ENABLE_SELLER_BADGE, true);

// Pack 10 annonces → Désactivé. Remplacé par les Packs de Crédits.
export const ENABLE_LISTING_PACK = false;

// Packs de crédits : activé
export const ENABLE_CREDIT_PACKS = true;

// Prix en FCFA
export const BOOST_PRICE = 500;
export const BOOST_DURATION_DAYS = 7;
export const BUMP_PRICE = 200;
export const SELLER_BADGE_PRICE = 2500;
export const SELLER_BADGE_DURATION_DAYS = 30;
export const SELLER_BADGE_YEARLY_PRICE = 25000;
export const SELLER_BADGE_YEARLY_DURATION_DAYS = 365;
export const LISTING_PACK_PRICE = 500;
export const LISTING_PACK_QUANTITY = 10;
export const PACK_PRO_PRICE = 2500;
export const PRO_BOOSTS_PER_MONTH = 1;
export const PRO_FREE_BOOST_DURATION_DAYS = 2;

// Packs de crédits disponibles à l'achat
export const CREDIT_PACKS = [
  { id: 'credits_pack_5', credits: 5, price: 500, label: 'Pack Bronze', popular: false },
  { id: 'credits_pack_12', credits: 12, price: 1000, label: 'Pack Argent', popular: true },
  { id: 'credits_pack_30', credits: 30, price: 2000, label: 'Pack Or', popular: false },
] as const;

// Coûts en crédits pour booster une annonce selon la durée
export const BOOST_CREDIT_COSTS = [
  { days: 1, credits: 1, label: '24 heures' },
  { days: 2, credits: 2, label: '2 jours' },
  { days: 7, credits: 5, label: '7 jours' },
] as const;

