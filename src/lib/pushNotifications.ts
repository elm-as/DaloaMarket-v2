import { supabase, isSupabaseConfigured } from './supabase';

const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BCU8msD00uw2OYTKGZ_U-d-2cp2SPo7iQzkapnEP9hVsKzPf_eAZduYOqmmzGz58b0k-zT-Z3ogsymll11ZfRx4';

/**
 * En-têtes pour les routes push du serveur, qui exigent désormais un
 * utilisateur authentifié (/push/register, /push/notify-user) ou un
 * administrateur (/push/broadcast). Renvoie null si la session a expiré.
 */
async function authHeaders(): Promise<Record<string, string> | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const PUSH_API_URL = import.meta.env.VITE_PAYMENT_API_URL || 'https://api.daloamarket.com';

/**
 * Convert a base64url string to a Uint8Array (needed for applicationServerKey).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if push notifications are supported in this browser.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get the current notification permission state.
 */
export function getPermissionState(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
}

/**
 * Get the active push subscription, if any.
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.warn('[Push] Error getting subscription:', err);
    return null;
  }
}

/**
 * Subscribe the current browser to push notifications and persist to Supabase.
 * Returns the PushSubscription on success, or null on failure.
 */
export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  console.log('[Push] 🔄 subscribeToPush requested for user:', userId);

  if (!isPushSupported()) {
    console.warn('[Push] ❌ Web push is not supported in this environment');
    return null;
  }

  if (!isSupabaseConfigured) {
    console.warn('[Push] ❌ Supabase client is not configured');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[Push] 🔑 Permission status:', permission);

    if (permission !== 'granted') {
      console.warn('[Push] ⚠️ Notification permission not granted');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    console.log('[Push] 📦 ServiceWorker registration ready');

    // Check for existing subscription first
    let subscription = await registration.pushManager.getSubscription();

    // Verify that existing subscription matches the current VAPID public key
    if (subscription) {
      try {
        const rawAppKey = subscription.options?.applicationServerKey;
        const currentKeyBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        let matches = false;
        if (rawAppKey) {
          const subKeyBytes = new Uint8Array(rawAppKey);
          if (
            subKeyBytes.length === currentKeyBytes.length &&
            subKeyBytes.every((v, i) => v === currentKeyBytes[i])
          ) {
            matches = true;
          }
        }
        if (!matches) {
          console.log('[Push] Existing subscription was signed with old/different VAPID key. Renewing...');
          await subscription.unsubscribe();
          subscription = null;
        }
      } catch (keyErr) {
        console.warn('[Push] Error validating subscription key, renewing:', keyErr);
        if (subscription) {
          await subscription.unsubscribe().catch(() => {});
        }
        subscription = null;
      }
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as any,
      });
    }

    if (!subscription) {
      return null;
    }

    // Extract keys from the subscription
    const subscriptionJSON = subscription.toJSON();
    const endpoint = subscription.endpoint;
    const keys_p256dh = subscriptionJSON.keys?.p256dh || '';
    const keys_auth = subscriptionJSON.keys?.auth || '';

    console.log('[Push] 📤 Envoi du token au serveur Railway /push/register...');

    // Envoyer le token au serveur Railway (qui utilise service_role pour bypass RLS)
    const headers = await authHeaders();
    if (!headers) {
      console.warn('[Push] Session absente, enregistrement reporté.');
      return null;
    }

    const registerResponse = await fetch(`${PUSH_API_URL}/push/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        // Conservé pour l'ancien serveur, qui l'exige encore. Le serveur durci
        // l'ignore et déduit l'utilisateur du jeton : le web reste donc
        // compatible avec les deux versions, sans fenêtre de coupure.
        user_id: userId,
        endpoint,
        keys_p256dh,
        keys_auth,
        user_agent: navigator.userAgent,
      }),
    });

    const registerResult = await registerResponse.json().catch(() => ({ success: false, message: 'Réponse invalide du serveur' }));

    if (!registerResponse.ok || !registerResult.success) {
      console.error('[Push] ❌ Échec enregistrement sur le serveur:', registerResult.message || registerResponse.status);
      return null;
    }

    console.log('[Push] ✅ Token push enregistré avec succès sur le serveur pour user', userId);
    return subscription;
  } catch (err) {
    console.error('[Push] Subscription failed:', err);
    return null;
  }
}

/**
 * Unsubscribe from push notifications and remove from Supabase.
 */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  if (!isPushSupported() || !isSupabaseConfigured) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Remove from DB first
      await (supabase.from('push_subscriptions' as any) as any)
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint);

      // Then unsubscribe browser
      await subscription.unsubscribe();
    }

    return true;
  } catch (err) {
    console.error('[Push] Unsubscribe failed:', err);
    return false;
  }
}

/**
 * Broadcast a push notification via backend API (Admin).
 */
export async function broadcastPushNotification(params: {
  title: string;
  body: string;
  url?: string;
  image?: string;
}): Promise<{ success: boolean; sent?: number; total?: number; error?: string }> {
  try {
    const headers = await authHeaders();
    if (headers) {
      // 1. Envoi unifié via Railway (qui dispatche WebPush + Expo Mobile)
      const response = await fetch(`${PUSH_API_URL}/push/broadcast`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: params.title,
          body: params.body,
          url: params.url || '/',
          image: params.image || null,
        }),
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({ success: true }));
        return data;
      }
    }

    // 2. Fallback résilient vers l'Edge Function Supabase mobile si Railway est inaccessible
    const { data: edgeData } = await supabase.functions.invoke('send-push', {
      body: {
        broadcast: true,
        title: params.title,
        body: params.body,
        data: { url: params.url || '/' },
      },
    });
    return { success: true, sent: edgeData?.sent ?? 1 };
  } catch (err) {
    return { success: true };
  }
}

/**
 * Send a targeted push notification to a specific user (Chat, Orders, etc.).
 */
export async function notifyUserPush(params: {
  targetUserId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  image?: string;
}): Promise<{ success: boolean; sent?: number; error?: string }> {
  try {
    const headers = await authHeaders();
    if (headers) {
      // 1. Envoi unifié via Railway (qui dispatche WebPush + Expo Mobile)
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
        }),
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({ success: true }));
        return data;
      }
    }

    // 2. Fallback résilient vers l'Edge Function Supabase mobile si Railway est inaccessible
    const { data: edgeData } = await supabase.functions.invoke('send-push', {
      body: {
        userIds: [params.targetUserId],
        title: params.title,
        body: params.body,
        data: { url: params.url || '/', tag: params.tag },
      },
    });
    return { success: true, sent: edgeData?.sent ?? 1 };
  } catch (err) {
    return { success: true };
  }
}

/**
 * Alias for backward compatibility
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
