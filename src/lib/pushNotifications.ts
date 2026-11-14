import {
  getExistingSubscription,
  getPermissionState,
  getPushAuthHeaders,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from './pushSubscriptionClient';

export {
  getExistingSubscription,
  getPermissionState,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
};

const PUSH_API_URL = import.meta.env.VITE_PAYMENT_API_URL || 'https://api.daloamarket.com';

export interface CampaignPreviewSample {
  userId: string;
  recipientName: string;
  title: string;
  body: string;
  url: string;
}

export type CampaignSegment =
  | 'dormant'
  | 'active_seller'
  | 'seller_no_promo'
  | 'buyer_cancelled';

export interface SegmentedCampaignResponse {
  success: boolean;
  dryRun?: boolean;
  segment?: CampaignSegment;
  recipientsCount?: number;
  sent?: number;
  samples?: CampaignPreviewSample[];
  error?: string;
  message?: string;
}

/**
 * Diffuse ou simule (`dryRun`) une notification push globale ou filtrée par app (`market`/`delivery`).
 * Les variables dynamiques (`$nom`, `$lien`, `$numero`, `$chaine`) sont résolues côté serveur.
 */
export async function broadcastPushNotification(params: {
  title: string;
  body: string;
  url?: string;
  image?: string;
  appType?: 'market' | 'delivery';
  dryRun?: boolean;
}): Promise<{
  success: boolean;
  dryRun?: boolean;
  recipientsCount?: number;
  devicesCount?: number;
  sent?: number;
  total?: number;
  samples?: CampaignPreviewSample[];
  error?: string;
  message?: string;
}> {
  try {
    const headers = await getPushAuthHeaders();
    if (!headers) {
      return { success: false, error: 'Session absente' };
    }

    const response = await fetch(`${PUSH_API_URL}/push/broadcast`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: params.title,
        body: params.body,
        url: params.url || '/',
        image: params.image || null,
        appType: params.appType,
        dryRun: Boolean(params.dryRun),
      }),
    });

    return await response.json().catch(() => ({ success: response.ok }));
  } catch (err: any) {
    console.warn('[Push Broadcast] Erreur:', err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Envoie ou prévisualise une campagne push personnalisée par segment (`$nom`, `$lien`, `$chaine`, `$numero`).
 */
export async function sendSegmentedPushCampaign(params: {
  segment: CampaignSegment;
  title: string;
  body: string;
  url?: string;
  dryRun?: boolean;
}): Promise<SegmentedCampaignResponse> {
  try {
    const headers = await getPushAuthHeaders();
    if (!headers) {
      return { success: false, error: 'Session absente' };
    }

    const response = await fetch(`${PUSH_API_URL}/push/campaign`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        segment: params.segment,
        title: params.title,
        body: params.body,
        url: params.url || '/',
        dryRun: Boolean(params.dryRun),
      }),
    });

    return await response.json().catch(() => ({ success: response.ok }));
  } catch (err: any) {
    console.warn('[Push Campaign] Erreur:', err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Envoie une notification push ciblée à un utilisateur spécifique (Chat, Commandes, etc.).
 */
export async function notifyUserPush(params: {
  targetUserId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  image?: string;
  chatPartnerId?: string;
  listingId?: string;
  orderId?: string;
}): Promise<{ success: boolean; sent?: number; error?: string }> {
  try {
    const headers = await getPushAuthHeaders();
    if (!headers) {
      return { success: false, error: 'Session absente' };
    }

    const response = await fetch(`${PUSH_API_URL}/push/notify-user`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        targetUserId: params.targetUserId,
        title: params.title,
        body: params.body,
        url: params.url || '/',
        tag: params.tag || 'user-alert',
        image: params.image || null,
        chatPartnerId: params.chatPartnerId || null,
        listingId: params.listingId || null,
        orderId: params.orderId || null,
      }),
    });

    return await response.json().catch(() => ({ success: response.ok }));
  } catch (err: any) {
    console.warn('[Push NotifyUser] Erreur:', err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Alias de compatibilité pour les appels existants.
 */
export const sendPushNotification = async (params: {
  target: 'all' | string[];
  title: string;
  body: string;
  url?: string;
}) => {
  if (params.target === 'all') {
    return broadcastPushNotification({
      title: params.title,
      body: params.body,
      url: params.url,
    });
  }
  if (Array.isArray(params.target) && params.target.length === 1) {
    return notifyUserPush({
      targetUserId: params.target[0],
      title: params.title,
      body: params.body,
      url: params.url,
    });
  }
  return broadcastPushNotification({
    title: params.title,
    body: params.body,
    url: params.url,
  });
};
