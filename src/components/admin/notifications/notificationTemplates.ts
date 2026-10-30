export * from './notificationTemplates.types';
import type { NotificationTemplate } from './notificationTemplates.types';
import { GROWTH_TEMPLATES } from './growthTemplates';
import { CORE_TEMPLATES } from './coreTemplates';

/**
 * Catalogue complet des modèles de notifications push DaloaMarket & DaloaDelivery.
 * Les modèles de croissance (sondages WhatsApp, diversité d'articles, petits prix,
 * déclencheurs première commande) sont présentés en priorité pour stimuler l'offre et la demande.
 */
export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  ...GROWTH_TEMPLATES,
  ...CORE_TEMPLATES,
];
