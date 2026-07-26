/**
 * Filtre Anti-Fuite (Data Loss Prevention)
 * Censurer les coordonnées pour éviter le contournement des frais de la plateforme.
 */

// On cible 8 à 14 chiffres, avec jusqu'à 4 caractères non-numériques entre eux.
// Cela gère les cas complexes d'obfuscation comme "07F88F00F08F31" ou "0 7 . 8 8"
const CENSOR_MESSAGE = '[Coordonnées masquées par sécurité]';

// Liste des réseaux sociaux et expressions de contact fréquentes
const SOCIAL_REGEX = /whatsapp|wa\.me|insta(?:gram)?|snap(?:chat)?|telegram|t\.me|facebook|fb|messenger|tiktok|appel(?:le)?[- ]moi|mon num(?:[ée]ro)?|mon contact/gi;

export function censorMessageContent(content: string): string {
  if (!content) return content;
  
  let censored = content;
  
  // 1. Détection des numéros même s'ils sont écrits en lettres (ex: "zéro sept 8...")
  const digitWords = ['z[eé]ro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const digitPattern = `(?:\\d|${digitWords.join('|')})`;
  
  // Pattern: un chiffre (ou chiffre en lettres) suivi de 0 à 5 caractères non-alphanumériques ou lettres
  // Cela attrape "zéro 7 F 8 huit..."
  const advancedPhoneRegex = new RegExp(`(?:\\+?${digitPattern}[\\s\\W_a-zA-Z]{0,5}){7,14}${digitPattern}`, 'gi');
  
  censored = censored.replace(advancedPhoneRegex, (match) => {
    // Exception 1 : on épargne les UUID (souvent utilisés pour les ID de commande)
    if (match.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)) {
      return match;
    }
    
    // Exception 2 : Séries de montants (ex: "15000 et 20000" ou "5000, 10000")
    // Si la séquence contient au moins deux blocs de 4 chiffres ou plus (des prix en FCFA),
    // et qu'elle ne commence pas par un préfixe téléphonique classique (0, 225, +)
    const startsWithPhonePrefix = /^(?:\+|225|0|z[eé]ro)/i.test(match.trim());
    const largeNumberBlocks = match.match(/\d{4,}/g);
    
    if (!startsWithPhonePrefix && largeNumberBlocks && largeNumberBlocks.length >= 2) {
      return match; // On ne censure pas, ce sont probablement des prix
    }

    return CENSOR_MESSAGE;
  });
  
  // 2. Remplacer les mentions aux réseaux sociaux et expressions directes
  censored = censored.replace(SOCIAL_REGEX, CENSOR_MESSAGE);
  
  return censored;
}
