/**
 * Modèles de notifications marketing, classés par objectif. Choisir un modèle
 * remplit le formulaire d'envoi ; rien ne part sans validation.
 *
 * Les liens vers le site livreur pointaient vers livreur.daloamarket.com,
 * domaine inutilisé : ils visent maintenant delivery.daloamarket.com.
 */
export interface NotificationTemplate {
  id: string;
  category: 'whatsapp' | 'pwa' | 'publish' | 'buy' | 'events' | 'trust' | 'drivers' | 'reactivate';
  categoryLabel: string;
  title: string;
  body: string;
  url: string;
  recommendedTime: string;
  /** Application visée par défaut (sinon DaloaMarket). */
  audience?: 'market' | 'delivery';
}

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  // 💬 0. LEVIER A — CATALOGUE WHATSAPP & STATUT VENDEUR
  {
    id: 'whatsapp-no-blur',
    category: 'whatsapp',
    categoryLabel: 'Statut WhatsApp (Levier A)',
    title: "📲 Fini d'envoyer 30 photos floues sur ton statut WhatsApp !",
    body: "Partage simplement le lien de ta boutique DaloaMarket. Tes clients voient tous tes articles avec prix et photos nettes en 1 clic.",
    url: '/profile?tab=shop',
    recommendedTime: 'Matin entre 08h30 et 10h00',
  },
  {
    id: 'whatsapp-pro-time',
    category: 'whatsapp',
    categoryLabel: 'Statut WhatsApp (Levier A)',
    title: "💼 Gagne du temps : ton catalogue complet en 1 seul lien",
    body: "Ne perds plus des heures à répéter les prix en inbox ! Mets le lien de ta boutique DaloaMarket dans ton statut et sur tes groupes.",
    url: '/profile?tab=shop',
    recommendedTime: 'Après-midi entre 13h30 et 15h00',
  },
  {
    id: 'whatsapp-direct-contact',
    category: 'whatsapp',
    categoryLabel: 'Statut WhatsApp (Levier A)',
    title: "💬 Partage ta vitrine : tes clients te contactent en direct",
    body: "En voyant ta boutique DaloaMarket, tes clients découvrent tout ton stock et peuvent t'écrire ou t'appeler directement sur WhatsApp.",
    url: '/profile?tab=shop',
    recommendedTime: 'Samedi matin entre 08h30 et 10h30',
  },
  {
    id: 'whatsapp-new-arrivals',
    category: 'whatsapp',
    categoryLabel: 'Statut WhatsApp (Levier A)',
    title: "🚀 Nouvel arrivage ? Partage ton lien en statut aujourd'hui !",
    body: "Dépose tes nouveautés sur DaloaMarket et partage le lien dans ton statut WhatsApp pour faire exploser tes ventes du jour.",
    url: '/create-listing',
    recommendedTime: 'Mercredi ou Vendredi vers 11h00',
  },
  {
    id: 'whatsapp-join-channel',
    category: 'whatsapp',
    categoryLabel: 'Statut WhatsApp (Levier A)',
    title: "🛍️ Rejoins la chaîne WhatsApp officielle DaloaMarket !",
    body: "Sois le premier alerté des nouveaux arrivages, ventes flash et promotions à Daloa. Clique pour t'abonner !",
    url: 'https://whatsapp.com/channel/0029Vb94o2vJENy5kkADR42U',
    recommendedTime: 'Soirée vers 19h00 ou week-end',
  },
  {
    id: 'whatsapp-deals-channel',
    category: 'whatsapp',
    categoryLabel: 'Statut WhatsApp (Levier A)',
    title: "⚡ Bons plans en direct : rejoins notre chaîne WhatsApp",
    body: "Découvre les meilleures pépites publiées chaque jour à Daloa directement dans ton onglet Actus WhatsApp.",
    url: 'https://whatsapp.com/channel/0029Vb94o2vJENy5kkADR42U',
    recommendedTime: 'Midi vers 12h30 ou Vendredi soir',
  },

  // 📲 1. INSTALLATION PWA / APPLICATION MOBILE
  {
    id: 'pwa-general',
    category: 'pwa',
    categoryLabel: 'Installation App',
    title: "📲 Installe DaloaMarket sur ton écran d'accueil !",
    body: "Plus besoin de chercher dans ton navigateur ! Accède à tes annonces et commandes en 1 clic avec l'application mobile.",
    url: '/',
    recommendedTime: 'Soirée (vers 18h30) ou week-end',
  },
  {
    id: 'pwa-speed',
    category: 'pwa',
    categoryLabel: 'Installation App',
    title: '⚡ Plus rapide et moins de connexion consommée !',
    body: "Installe l'app DaloaMarket en 2 secondes : navigation ultra-fluide et économie sur ton forfait internet.",
    url: '/',
    recommendedTime: 'Midi entre 12h30 et 13h30',
  },
  {
    id: 'pwa-sellers',
    category: 'pwa',
    categoryLabel: 'Installation App',
    title: '🔔 Ne rate aucun client : installe ton application !',
    body: "Reçois des alertes directes dès qu'un acheteur t'écrit ou passe commande à Daloa. Ajoute l'app sur ton téléphone.",
    url: '/create-listing',
    recommendedTime: 'Matin vers 09h30',
  },
  {
    id: 'pwa-drivers',
    category: 'pwa',
    audience: 'delivery',
    categoryLabel: 'Installation App',
    title: "🛵 Installe l'application DaloaDelivery sur ton téléphone !",
    body: 'Reçois les alertes sonores de courses express en direct à Daloa et valide tes livraisons en 1 clic.',
    url: 'https://delivery.daloamarket.com/dashboard',
    recommendedTime: 'Matin vers 08h30 ou 11h30',
  },

  // 💰 2. INCITER À PUBLIER & VENDRE
  {
    id: 'pub-passive',
    category: 'publish',
    categoryLabel: 'Vente & Publication',
    title: '💰 Une annonce aujourd’hui, de l’argent qui rentre demain !',
    body: "Publie ton article en 1 minute : il reste visible 24h/24 auprès de milliers d'acheteurs à Daloa. Ne laisse pas dormir tes produits !",
    url: '/create-listing',
    recommendedTime: 'Mercredi ou Jeudi vers 12h30',
  },
  {
    id: 'pub-declutter',
    category: 'publish',
    categoryLabel: 'Vente & Publication',
    title: '📦 Transforme tes objets inutilisés en cash !',
    body: 'Un téléphone, un vêtement ou un appareil qui traîne chez toi ? Dépose ton annonce gratuitement et trouve un acheteur à Daloa aujourd’hui.',
    url: '/create-listing',
    recommendedTime: 'Samedi matin entre 09h00 et 11h00',
  },
  {
    id: 'pub-shop',
    category: 'publish',
    categoryLabel: 'Vente & Publication',
    title: '🏬 Commerçants de Daloa : vendez sans bouger de votre boutique !',
    body: 'Créez votre catalogue en ligne sur DaloaMarket et bénéficiez de la livraison express partout en ville.',
    url: '/create-listing',
    recommendedTime: 'Mardi ou Jeudi matin vers 10h00',
  },
  {
    id: 'pub-vehicles',
    category: 'publish',
    categoryLabel: 'Vente & Publication',
    title: '🏍️ Vends ta moto ou ta voiture rapidement à Daloa !',
    body: 'Des centaines d’acheteurs cherchent des engins roulants tous les jours. Dépose ton annonce avec photos en 2 minutes.',
    url: '/create-listing',
    recommendedTime: 'Samedi vers 10h30',
  },
  {
    id: 'pub-pro-badge',
    category: 'publish',
    categoryLabel: 'Vente & Publication',
    title: '👑 Passe Vendeur PRO et multiplie tes ventes par 5 !',
    body: 'Obtiens le badge vérifié, une commission réduite à 2.5% et une visibilité maximale en tête de liste.',
    url: '/devenir-pro',
    recommendedTime: 'Lundi matin vers 09h00',
  },

  // 🛍️ 3. ACHATS, NOUVEAUTÉS & CATÉGORIES
  {
    id: 'buy-friday',
    category: 'buy',
    categoryLabel: 'Achats & Découverte',
    title: '🔥 De nouveaux articles sont arrivés à Daloa !',
    body: 'Électronique, mode, motos... Découvre les dernières offres publiées près de chez toi et fais de bonnes affaires.',
    url: '/',
    recommendedTime: 'Vendredi soir vers 18h30',
  },
  {
    id: 'buy-tech',
    category: 'buy',
    categoryLabel: 'Achats & Découverte',
    title: '📱 À la recherche d’un bon téléphone à bon prix ?',
    body: 'iPhone, Samsung, tablettes et accessoires disponibles dès maintenant à Daloa. Compare les prix et commande en toute sécurité.',
    url: '/c/electronique',
    recommendedTime: 'Mercredi vers 13h00',
  },
  {
    id: 'buy-fashion',
    category: 'buy',
    categoryLabel: 'Achats & Découverte',
    title: '👗 Prépare ton week-end avec du style !',
    body: 'Vêtements, chaussures et accessoires tendance en vente à Daloa. Fais-toi livrer directement chez toi.',
    url: '/c/mode',
    recommendedTime: 'Jeudi ou Vendredi vers 17h00',
  },
  {
    id: 'buy-motos',
    category: 'buy',
    categoryLabel: 'Achats & Découverte',
    title: '🏍️ Motos Haojue, TVS, Boxer disponibles à Daloa !',
    body: 'Trouve la moto idéale pour tes déplacements ou ton activité à des prix défiant toute concurrence.',
    url: '/c/vehicules',
    recommendedTime: 'Samedi vers 11h00',
  },
  {
    id: 'buy-home',
    category: 'buy',
    categoryLabel: 'Achats & Découverte',
    title: '📺 Équipe ta maison au meilleur prix à Daloa !',
    body: 'Smart TV, réfrigérateurs, ventilateurs et meubles disponibles immédiatement près de chez toi.',
    url: '/c/maison-deco',
    recommendedTime: 'Dimanche après-midi vers 15h00',
  },

  // ⚡ 4. ÉVÉNEMENTS, WEEK-END & FIN DE MOIS
  {
    id: 'event-weekend',
    category: 'events',
    categoryLabel: 'Moments Clés',
    title: '🎉 Le week-end commence, les bonnes affaires aussi !',
    body: 'Parcours des centaines d’articles disponibles à Daloa et contacte directement les vendeurs.',
    url: '/',
    recommendedTime: 'Samedi vers 11h00',
  },
  {
    id: 'event-payday',
    category: 'events',
    categoryLabel: 'Moments Clés',
    title: '💼 C’est la fin du mois : fais-toi plaisir malin !',
    body: 'Trouve ce dont tu as besoin à prix imbattable sur DaloaMarket : électronique, électroménager, mode et plus.',
    url: '/',
    recommendedTime: 'Entre le 28 et le 2 du mois vers 19h00',
  },
  {
    id: 'event-sunday-deals',
    category: 'events',
    categoryLabel: 'Moments Clés',
    title: '☕ Dimanche tranquille : explore les ventes flash !',
    body: 'Installe-toi confortablement et découvre les offres exclusives disponibles ce dimanche à Daloa.',
    url: '/',
    recommendedTime: 'Dimanche matin vers 10h00',
  },
  {
    id: 'event-rentree',
    category: 'events',
    categoryLabel: 'Moments Clés',
    title: '🎒 Prépare la rentrée sans te ruiner à Daloa !',
    body: 'Fournitures, sacs, ordinateurs portables et tenues scolaires à prix direct particulier.',
    url: '/search',
    recommendedTime: 'Période de rentrée scolaire vers 14h00',
  },

  // 🔒 5. SÉCURITÉ, CONFIANCE & SÉQUESTRE
  {
    id: 'trust-escrow',
    category: 'trust',
    categoryLabel: 'Sécurité & Séquestre',
    title: '🔒 Achetez l’esprit tranquille avec DaloaPay Séquestre',
    body: 'Votre argent reste bloqué en sécurité et n’est versé au vendeur qu’après vérification et validation de votre code OTP.',
    url: '/how-it-works',
    recommendedTime: 'Lundi ou Mardi vers 14h00',
  },
  {
    id: 'trust-fast-delivery',
    category: 'trust',
    categoryLabel: 'Sécurité & Séquestre',
    title: '⚡ Livraison en moins de 45 minutes partout à Daloa !',
    body: 'Commandez en ligne et recevez votre colis à Commerce, Tazibouo, Lobia ou Kennedy sans vous déplacer.',
    url: '/how-it-works',
    recommendedTime: 'Mercredi ou Vendredi vers 11h30',
  },

  // 🔄 6. RÉACTIVATION DES INACTIFS
  {
    id: 'reactivate-missed',
    category: 'reactivate',
    categoryLabel: 'Réactivation',
    title: '👋 Tu nous as manqué ! Découvre les nouveautés à Daloa',
    body: 'Des dizaines de nouvelles annonces ont été publiées cette semaine dans ton quartier. Viens jeter un coup d’œil !',
    url: '/',
    recommendedTime: 'Samedi après-midi vers 16h00',
  },
  {
    id: 'reactivate-price-drop',
    category: 'reactivate',
    categoryLabel: 'Réactivation',
    title: '📉 Des baisses de prix viennent d’avoir lieu à Daloa !',
    body: 'Plusieurs vendeurs ont réduit leurs tarifs aujourd’hui. C’est le moment idéal pour faire une bonne affaire.',
    url: '/search',
    recommendedTime: 'Mardi soir vers 19h00',
  },

  // 🛵 7. LIVREURS DALOADELIVERY
  {
    id: 'driver-recruit',
    category: 'drivers',
    audience: 'delivery',
    categoryLabel: 'Livreurs DaloaDelivery',
    title: '🛵 Tu as une moto à Daloa ? Gagne de l’argent chaque jour !',
    body: 'Rejoins le réseau DaloaDelivery : reçois des courses directement sur ton téléphone et sois payé instantanément.',
    url: 'https://delivery.daloamarket.com/inscription',
    recommendedTime: 'Lundi ou Mercredi vers 10h00',
  },
  {
    id: 'driver-online',
    category: 'drivers',
    audience: 'delivery',
    categoryLabel: 'Livreurs DaloaDelivery',
    title: '🛵 Forte demande de livraisons en cours à Daloa !',
    body: 'Passez en ligne sur votre cockpit DaloaDelivery : plusieurs colis attendent d’être pris en charge dès maintenant.',
    url: 'https://delivery.daloamarket.com/dashboard',
    recommendedTime: 'Midi (12h00) ou Soir (18h00)',
  },
];

