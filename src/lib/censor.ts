/**
 * Filtre Anti-Fuite (Data Loss Prevention)
 * Censurer les coordonnées pour éviter le contournement des frais de la plateforme.
 */

// On cible 8 à 14 chiffres, avec jusqu'à 4 caractères non-numériques entre eux.
// Cela gère les cas complexes d'obfuscation comme "07F88F00F08F31" ou "0 7 . 8 8"
const CENSOR_MESSAGE = '[Coordonnées masquées par sécurité]';

// Liste des réseaux sociaux et expressions de contact fréquentes avec frontières de mots (\b)
// Empêche de censurer "installé" (insta), "instant", etc.
const SOCIAL_REGEX =
  /\b(?:whatsapp|wa\.me|insta(?:gram)?|snap(?:chat)?|telegram|t\.me|facebook|fb|messenger|tiktok)\b|\b(?:appel(?:le)?[- ]moi|mon num(?:[ée]ro)?|mon contact|mon phone|mon t[ée]l|contacte?[- ]moi (?:sur|au|par)|viens sur (?:wa|whatsapp))\b/gi;

export function censorMessageContent(content: string): string {
  if (!content) return content;

  let censored = content;
  const preservedTokens: { placeholder: string; value: string }[] = [];

  // Protéger les UUID (références de commandes, listings, utilisateurs)
  censored = censored.replace(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
    (uuid) => {
      const placeholder = `__UUID_TOKEN_${preservedTokens.length}__`;
      preservedTokens.push({ placeholder, value: uuid });
      return placeholder;
    }
  );

  // 1. Détection des numéros même s'ils sont écrits en lettres (ex: "zéro sept 8...")
  const digitWords = ['z[eé]ro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const digitPattern = `(?:\\d|${digitWords.join('|')})`;

  // Détecte une séquence d'au moins 8 à 14 chiffres (avec séparateurs optionnels)
  const advancedPhoneRegex = new RegExp(
    `(?:\\+?${digitPattern}[\\s\\W_a-zA-Z]{0,4}){7,14}${digitPattern}`,
    'gi'
  );

  censored = censored.replace(advancedPhoneRegex, (match) => {
    // Exception : Séries de montants / prix (ex: "15000 et 20000" ou "5000, 10000")
    const startsWithPhonePrefix = /^(?:\+|225|0|z[eé]ro)/i.test(match.trim());
    const digitsOnly = match.replace(/\D/g, '');

    // Si ce n'est pas un préfixe téléphonique et que ça ressemble à 1 ou 2 montants
    if (!startsWithPhonePrefix && digitsOnly.length < 8) {
      return match;
    }

    const largeNumberBlocks = match.match(/\d{4,}/g);
    if (!startsWithPhonePrefix && largeNumberBlocks && largeNumberBlocks.length >= 2) {
      return match;
    }

    return CENSOR_MESSAGE;
  });

  // 2. Remplacer les mentions aux réseaux sociaux et expressions directes
  censored = censored.replace(SOCIAL_REGEX, CENSOR_MESSAGE);

  // Nettoyer les répétitions successives de messages de censure
  censored = censored.replace(/(?:\[Coordonnées masquées par sécurité\](?:\s*))+/g, `${CENSOR_MESSAGE} `).trim();

  // Restaurer les tokens préservés (UUIDs)
  for (const { placeholder, value } of preservedTokens) {
    censored = censored.replace(placeholder, value);
  }

  return censored;
}
