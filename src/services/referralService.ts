import { supabase } from '../lib/supabase';

/**
 * Parrainage ambassadeur — capture du code, puis rattachement.
 *
 * Le code arrive par l'URL (`?ref=`), sur n'importe quelle page : un ambassadeur
 * partage souvent le lien d'une annonce, pas celui de l'inscription. On le met
 * donc de côté dès le chargement de l'application, et on le consomme plus tard,
 * une fois le compte réellement créé — peu importe le chemin d'inscription
 * (email, Google, ou une session ouverte depuis un autre appareil).
 *
 * Avant, seul `RegisterForm` lisait le code, et seule la branche email le
 * consommait : une inscription Google perdait le parrainage sans un bruit.
 */

const CODE_KEY = 'daloa_ref_code';
const CODE_AT_KEY = 'daloa_ref_code_at';
const TRIED_KEY = 'daloa_ref_tried';

/** Au-delà, on considère que la visite n'a plus de rapport avec l'ambassadeur. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Forme d'un code ambassadeur : lettres, chiffres et tirets. */
const CODE_SHAPE = /^[A-Z0-9][A-Z0-9-]{2,23}$/;

/** Noms acceptés dans l'URL — les supports imprimés n'ont pas tous le même. */
const URL_PARAMS = ['ref', 'ambassador', 'parrain', 'code_parrain'];

const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    // Navigation privée, stockage bloqué : le parrainage est perdu, pas l'appli.
    return null;
  }
};

const writeStorage = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* idem */
  }
};

const removeStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* idem */
  }
};

const normalize = (raw: string | null | undefined): string | null => {
  const code = (raw || '').trim().toUpperCase();
  return CODE_SHAPE.test(code) ? code : null;
};

/**
 * Lit un éventuel code dans l'URL courante et le met de côté.
 * À appeler une fois au démarrage de l'application.
 */
export const captureReferralCode = (search?: string): string | null => {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(search ?? window.location.search);
  for (const name of URL_PARAMS) {
    const code = normalize(params.get(name));
    if (code) {
      // Un nouveau code remplace l'ancien : c'est le dernier ambassadeur
      // rencontré qui compte, et les tentatives passées ne le concernent pas.
      writeStorage(CODE_KEY, code);
      writeStorage(CODE_AT_KEY, String(Date.now()));
      removeStorage(TRIED_KEY);
      return code;
    }
  }
  return null;
};

/** Le code en attente, ou `null` s'il n'y en a pas ou qu'il a expiré. */
export const getPendingReferralCode = (): string | null => {
  const code = normalize(readStorage(CODE_KEY));
  if (!code) return null;

  const at = Number(readStorage(CODE_AT_KEY) || 0);
  // Un code sans horodatage vient d'une version précédente : on lui laisse sa chance.
  if (at > 0 && Date.now() - at > MAX_AGE_MS) {
    clearPendingReferral();
    return null;
  }
  return code;
};

export const clearPendingReferral = (): void => {
  removeStorage(CODE_KEY);
  removeStorage(CODE_AT_KEY);
  removeStorage(TRIED_KEY);
};

/** Comptes déjà présentés à ce code — on ne réessaie pas à chaque hydratation. */
const alreadyTried = (userId: string): boolean => {
  try {
    const list = JSON.parse(readStorage(TRIED_KEY) || '[]');
    return Array.isArray(list) && list.includes(userId);
  } catch {
    return false;
  }
};

const rememberTried = (userId: string): void => {
  try {
    const list = JSON.parse(readStorage(TRIED_KEY) || '[]');
    const next = Array.isArray(list) ? list : [];
    if (!next.includes(userId)) next.push(userId);
    // Un téléphone partagé peut voir passer plusieurs comptes ; on n'en garde
    // que les derniers pour ne pas laisser enfler le stockage.
    writeStorage(TRIED_KEY, JSON.stringify(next.slice(-5)));
  } catch {
    /* stockage indisponible : on retentera, la base tranchera de nouveau */
  }
};

/**
 * Rattache le compte à l'ambassadeur si un code est en attente.
 *
 * Silencieux par construction : un refus (compte déjà ancien, code inconnu,
 * vendeur déjà parrainé) n'a rien à dire à l'utilisateur, qui n'a souvent même
 * pas conscience d'avoir un code. La base journalise chaque tentative dans
 * `ambassador_referral_attempts`, c'est là que ça se regarde.
 *
 * @returns `true` si le rattachement vient d'être enregistré.
 */
export const redeemPendingReferral = async (userId: string | null | undefined): Promise<boolean> => {
  if (!userId) return false;

  const code = getPendingReferralCode();
  if (!code || alreadyTried(userId)) return false;

  try {
    // La fonction n'est pas dans les types générés (database.types.ts date d'avant
    // le module ambassadeur) — d'où la coupure de typage, volontaire et localisée.
    const { data, error } = await (supabase.rpc as any)('link_seller_to_ambassador', {
      p_seller_id: userId,
      p_referral_code: code,
    });

    // Erreur réseau ou serveur : le code reste en attente pour la prochaine session.
    if (error) return false;

    if (data === true) {
      clearPendingReferral();
      return true;
    }

    // Refus : ce compte-ci n'est pas éligible. On garde le code — sur un
    // téléphone prêté, le vendeur qui suit peut encore l'être — mais on
    // n'insiste plus avec ce compte.
    rememberTried(userId);
    return false;
  } catch (err) {
    console.error('Parrainage : rattachement impossible', err);
    return false;
  }
};
