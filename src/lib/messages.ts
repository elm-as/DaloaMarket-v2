/**
 * Messages utilisateur centralisés — FR, clairs, non techniques.
 * Utiliser ces helpers pour ne jamais exposer un message d'erreur brut au user.
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
];

/** Convertit une erreur (techn. ou non) en message FR user-friendly. */
export function friendlyError(err: unknown, fallback = 'Une erreur est survenue. Veuillez réessayer.'): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';

  if (!raw) return fallback;

  // Cas réseau
  if (/failed to fetch|networkerror|econnrefused/i.test(raw)) {
    return 'Connexion impossible. Vérifiez votre internet et réessayez.';
  }
  if (/timeout|timed out/i.test(raw)) {
    return 'Le serveur met trop de temps à répondre. Réessayez dans un instant.';
  }
  if (/invalid login|invalid credentials/i.test(raw)) {
    return 'Email ou mot de passe incorrect.';
  }
  if (/email.*not.*confirmed/i.test(raw)) {
    return 'Veuillez confirmer votre email avant de vous connecter.';
  }
  if (/user already registered|already exists/i.test(raw)) {
    return 'Un compte existe déjà avec cet email.';
  }
  if (/password.*should|weak password/i.test(raw)) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }

  // Si c'est manifestement technique → fallback
  if (TECHNICAL_PATTERNS.some((p) => p.test(raw))) {
    return fallback;
  }

  // Sinon, si le message est court et lisible (probablement déjà FR), on le garde
  if (raw.length < 120 && /[a-zàâéèêëîïôûüç]/i.test(raw)) {
    return raw;
  }

  return fallback;
}

/** Messages standards réutilisables. */
export const MSG = {
  // Auth
  signOutSuccess: 'À bientôt !',
  signOutError: 'Impossible de vous déconnecter pour le moment.',

  // Profile
  profileUpdated: 'Profil mis à jour',
  profileUpdateError: 'Impossible de mettre à jour votre profil.',
  avatarUpdated: 'Photo de profil mise à jour',
  avatarUploadError: "Impossible de téléverser la photo. Réessayez.",
  avatarFormatError: 'Format non supporté. Utilisez JPG, PNG ou WebP.',
  avatarSizeError: 'Image trop volumineuse (2 Mo max).',

  // Listings
  listingDeleted: 'Annonce supprimée',
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
  reportLoginRequired: 'Connectez-vous pour signaler.',

  // Payment
  paymentNameRequired: 'Entrez votre nom complet.',
  paymentPhoneInvalid: 'Numéro ivoirien invalide (10 chiffres).',
  paymentPreparing: 'Préparation du paiement…',
  paymentRedirecting: 'Redirection vers le paiement…',
  paymentError: "Le paiement n'a pas pu être lancé. Réessayez.",
} as const;
