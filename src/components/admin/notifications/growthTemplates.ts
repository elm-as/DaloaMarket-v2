import type { NotificationTemplate } from './notificationTemplates.types';

/**
 * Nouveaux modèles orientés croissance, diversification de l'offre et activation acheteurs.
 * Conçus pour répondre directement au besoin terrain :
 *  - Recueillir les envies réelles des utilisateurs via la chaîne WhatsApp (+130 inscrits)
 *  - Inciter les vendeurs à poster des articles variés et abordables (1 000 F à 10 000 F)
 *  - Déclencher la première commande sécurisée avec livraison express
 */
export const GROWTH_TEMPLATES: NotificationTemplate[] = [
  // 📊 SONDAGES WHATSAPP & ÉCOUTE DE LA COMMUNAUTÉ
  {
    id: 'survey-what-to-buy',
    category: 'survey',
    categoryLabel: '📊 Sondage WhatsApp & Avis Clients',
    title: '📊 Sondage : Que veux-tu acheter sur DaloaMarket ?',
    body: "Dis-nous en 1 clic ce qui t'intéresse sur notre chaîne WhatsApp. On sélectionne les meilleurs articles pour toi !",
    url: 'https://whatsapp.com/channel/0029Vb94o2vJENy5kkADR42U',
    recommendedTime: 'Midi vers 12h30 ou Soir vers 19h00',
  },
  {
    id: 'survey-cant-find',
    category: 'survey',
    categoryLabel: '📊 Sondage WhatsApp & Avis Clients',
    title: '💡 Tu ne trouves pas ton bonheur à Daloa ?',
    body: 'Participe au sondage du jour sur la chaîne WhatsApp ! Dis-nous les produits et les prix que tu attends.',
    url: 'https://whatsapp.com/channel/0029Vb94o2vJENy5kkADR42U',
    recommendedTime: 'Après-midi vers 15h00 ou week-end',
  },
  {
    id: 'survey-custom-request',
    category: 'survey',
    categoryLabel: '📊 Sondage WhatsApp & Avis Clients',
    title: '🎯 Dis-nous ce que tu cherches, on te le trouve !',
    body: 'Un téléphone, des baskets, des mèches ou un meuble ? Donne-nous tes envies dans le sondage WhatsApp !',
    url: 'https://whatsapp.com/channel/0029Vb94o2vJENy5kkADR42U',
    recommendedTime: 'Matin vers 10h00 ou Vendredi après-midi',
  },
  {
    id: 'survey-budget-adaptation',
    category: 'survey',
    categoryLabel: '📊 Sondage WhatsApp & Avis Clients',
    title: '💰 Quel est ton budget moyen pour tes achats ?',
    body: 'Aide-nous à adapter les prix des vendeurs : donne ton avis sur notre chaîne WhatsApp officielle !',
    url: 'https://whatsapp.com/channel/0029Vb94o2vJENy5kkADR42U',
    recommendedTime: 'Midi vers 12h00 ou Dimanche vers 16h00',
  },

  // 🛍️ DIVERSITÉ DES ARTICLES & PRIX ACCESSIBLES (VENDEURS)
  {
    id: 'diversity-sellers-demand',
    category: 'diversity',
    categoryLabel: '🛍️ Diversité d’Articles & Petits Prix',
    title: '👕 Vendeurs : les acheteurs demandent de la variété !',
    body: 'Mode, friperie, beauté, accessoires : nos +130 membres cherchent des articles du quotidien. Publie en 1 minute !',
    url: '/create-listing',
    recommendedTime: 'Matin vers 09h00 ou 11h30',
  },
  {
    id: 'diversity-low-prices',
    category: 'diversity',
    categoryLabel: '🛍️ Diversité d’Articles & Petits Prix',
    title: '🏷️ Les articles à petits prix partent le plus vite !',
    body: 'Des articles entre 1 000 F et 10 000 F séduisent immédiatement les acheteurs. Dépose ton offre maintenant !',
    url: '/create-listing',
    recommendedTime: 'Mercredi ou Vendredi vers 11h00',
  },
  {
    id: 'diversity-declutter',
    category: 'diversity',
    categoryLabel: '🛍️ Diversité d’Articles & Petits Prix',
    title: '📦 Vide ton placard : transforme tes affaires en cash !',
    body: 'Un vêtement ou accessoire en trop ? Propose-le à bon prix sur DaloaMarket et trouve un voisin preneur.',
    url: '/create-listing',
    recommendedTime: 'Samedi matin entre 09h00 et 11h30',
  },
  {
    id: 'diversity-daily-essentials',
    category: 'diversity',
    categoryLabel: '🛍️ Diversité d’Articles & Petits Prix',
    title: '🛒 Commerces de quartier : ouvrez votre vitrine en ligne',
    body: 'Alimentation, cosmétiques, quincaillerie : mettez vos produits à la vue de toute la ville de Daloa.',
    url: '/create-listing',
    recommendedTime: 'Mardi ou Jeudi vers 10h00',
  },

  // 🎁 ACTIVATION DU PREMIER ACHAT (ACHETEURS)
  {
    id: 'first-order-secure',
    category: 'first_order',
    categoryLabel: '🎁 Déclencheur Première Commande',
    title: '🔥 Prêt pour ta première commande sur DaloaMarket ?',
    body: 'Commande en toute sérénité : paiement sécurisé Mobile Money avec remise par code OTP à la livraison.',
    url: '/',
    recommendedTime: 'Soirée vers 19h00',
  },
  {
    id: 'first-order-fast-courier',
    category: 'first_order',
    categoryLabel: '🎁 Déclencheur Première Commande',
    title: "🛵 Besoin d'une livraison urgente à Daloa ?",
    body: 'Fais livrer tes achats ou colis partout en ville en moins de 45 minutes avec nos livreurs vérifiés.',
    url: '/how-it-works',
    recommendedTime: 'Midi vers 11h45',
  },
];
