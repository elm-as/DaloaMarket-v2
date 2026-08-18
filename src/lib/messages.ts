/**
 * Messages utilisateur centralisés — 100% Français, clairs et non techniques.
 * Convertit toute erreur brute (Supabase, réseau, Auth, API) en message compréhensible.
 */

const TECHNICAL_PATTERNS = [
  /^supabase/i,
  /jwt/i,
  /uuid/i,
  /violates.*constraint/i,
  /duplicate key/i,
  /^postgres/i,
  /^pgrst/i,
  /^auth\//i,
  /failed to fetch/i,
  /networkerror/i,
  /econnrefused/i,
  /timeout/i,
  /^http \d/i,
  /json object requested/i,
  /schema cache/i,
  /unexpected token/i,
  /internal server error/i,
];

/** Convertit une erreur (technique, API, Supabase ou réseau) en message français limpide. */
export function friendlyError(err: unknown, fallback = 'Une erreur est survenue. Veuillez réessayer.'): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';

  if (!raw) return fallback;

  // Cas réseau & serveurs
  if (/failed to fetch|networkerror|econnrefused|network request failed/i.test(raw)) {
    return 'Connexion impossible. Vérifiez votre connexion internet et réessayez.';
  }
  if (/timeout|timed out|abort/i.test(raw)) {
    return 'Le serveur met trop de temps à répondre. Réessayez dans un instant.';
  }

  // Cas Authentification Supabase
  if (/invalid login|invalid credentials|invalid_grant|user not found/i.test(raw)) {
    return 'Adresse email ou mot de passe incorrect.';
  }
  if (/email.*not.*confirmed|unconfirmed/i.test(raw)) {
    return 'Veuillez confirmer votre adresse email avant de vous connecter.';
  }
  if (/user already registered|already exists|signup_disabled/i.test(raw)) {
    return 'Un compte existe déjà avec cette adresse email.';
  }
  if (/password.*should|weak password|password too short/i.test(raw)) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }
  if (/jwt.*expired|session.*expired|invalid session/i.test(raw)) {
    return 'Votre session a expiré. Veuillez vous reconnecter.';
  }
  if (/not authenticated|unauthorized|user not logged in/i.test(raw)) {
    return 'Vous devez être connecté pour effectuer cette action.';
  }
  if (/permission denied|not authorized|row-level security|forbidden/i.test(raw)) {
    return 'Action non autorisée ou droits insuffisants.';
  }
  if (/too many requests|rate limit/i.test(raw)) {
    return 'Trop de tentatives en peu de temps. Veuillez patienter une minute.';
  }
  if (/pgrst116|no rows|zero rows|row not found/i.test(raw)) {
    return 'L’élément recherché est introuvable.';
  }

  // Si c'est manifestement technique → fallback français
  if (TECHNICAL_PATTERNS.some((p) => p.test(raw))) {
    return fallback;
  }

  // Si le message est déjà en français et lisible, on le conserve
  if (raw.length < 150 && /[a-zàâéèêëîïôûüç]/i.test(raw)) {
    return raw;
  }

  return fallback;
}

/** Messages standards réutilisables. */
export const MSG = {
  // Auth
  signOutSuccess: 'À bientôt !',
  signOutError: 'Impossible de vous déconnecter pour le moment.',
  loginSuccess: 'Connexion réussie !',
  loginError: 'Connexion impossible. Vérifiez vos identifiants.',
  registerSuccess: 'Compte créé avec succès !',
  registerError: "Échec de l'inscription. Veuillez réessayer.",

  // Profile
  profileUpdated: 'Profil mis à jour avec succès.',
  profileUpdateError: 'Impossible de mettre à jour votre profil.',
  avatarUpdated: 'Photo de profil mise à jour.',
  avatarUploadError: 'Impossible de téléverser la photo. Réessayez.',
  avatarFormatError: 'Format non supporté. Utilisez JPG, PNG ou WebP.',
  avatarSizeError: 'Image trop volumineuse (2 Mo max).',

  // Listings
  listingCreated: 'Annonce publiée avec succès !',
  listingUpdated: 'Annonce mise à jour avec succès !',
  listingDeleted: 'Annonce supprimée.',
  listingDeleteError: 'Impossible de supprimer cette annonce.',
  listingLoadError: 'Impossible de charger cette annonce.',
  listingsLoadError: 'Impossible de charger vos annonces.',

  // Messages
  conversationsLoadError: 'Impossible de charger vos conversations.',
  conversationLoadError: 'Impossible de charger cette conversation.',
  messageSendError: "Votre message n'a pas pu être envoyé.",
  conversationInvalid: 'Conversation introuvable.',
  selfChatError: 'Vous ne pouvez pas discuter avec vous-même.',

  // Reports
  reportTypeRequired: 'Choisissez un type de signalement.',
  reportDetailRequired: 'Précisez la raison de votre signalement.',
  reportSent: 'Signalement envoyé. Notre équipe va l\'examiner.',
  reportError: "Impossible d'envoyer votre signalement.",
  reportLoginRequired: 'Connectez-vous pour signaler cette annonce.',

  // Payment & Escrow
  paymentNameRequired: 'Entrez votre nom complet.',
  paymentPhoneInvalid: 'Numéro ivoirien invalide (10 chiffres, ex: 0700000000).',
  paymentPreparing: 'Préparation du paiement sécurisé…',
  paymentRedirecting: 'Redirection vers la passerelle de paiement…',
  paymentError: "Le paiement n'a pas pu être initié. Veuillez réessayer.",
  paymentCancelled: 'Paiement annulé.',
  paymentFailed: 'Le paiement a échoué. Veuillez réessayer avec un autre moyen.',
} as const;
