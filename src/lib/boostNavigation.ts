export interface BoostEligibilityProfile {
  listing_credits?: number | null;
  boost_credits?: number | null;
  pro_until?: string | null;
  pro_free_boost_used?: boolean | null;
}

export interface BoostDestinationRoutes {
  login: string;
  myListings: string;
  packs: string;
}

/**
 * Détermine si le vendeur dispose d'au moins un moyen de mettre en avant une annonce
 * (crédits de boost/annonce positifs ou boost Pro gratuit non encore consommé).
 */
export function hasAvailableBoostCredit(
  profile: BoostEligibilityProfile | null | undefined,
): boolean {
  if (!profile) return false;
  const credits = Number(profile.boost_credits ?? profile.listing_credits ?? 0);
  if (Number.isFinite(credits) && credits > 0) return true;
  if (!profile.pro_until) return false;
  const isProActive = new Date(profile.pro_until) > new Date();
  return isProActive && profile.pro_free_boost_used !== true;
}

/**
 * Retourne la route cible du bouton "Mettre en avant" selon la session et les crédits :
 * - non connecté -> page de connexion
 * - au moins 1 crédit / boost Pro gratuit disponible -> liste des annonces à booster
 * - sinon -> page d'achat de packs de crédits
 */
export function getBoostDestination(
  isAuthenticated: boolean,
  profile: BoostEligibilityProfile | null | undefined,
  routes: BoostDestinationRoutes,
): string {
  if (!isAuthenticated) return routes.login;
  return hasAvailableBoostCredit(profile) ? routes.myListings : routes.packs;
}
