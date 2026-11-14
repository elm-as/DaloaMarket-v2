import { supabase, isSupabaseConfigured } from './supabase';

const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BCU8msD00uw2OYTKGZ_U-d-2cp2SPo7iQzkapnEP9hVsKzPf_eAZduYOqmmzGz58b0k-zT-Z3ogsymll11ZfRx4';

const PUSH_API_URL = import.meta.env.VITE_PAYMENT_API_URL || 'https://api.daloamarket.com';

/**
 * En-têtes authentifiés pour les routes push serveur (`/push/*`).
 */
export async function getPushAuthHeaders(): Promise<Record<string, string> | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

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

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPermissionState(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
}

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

async function resolveValidBrowserSubscription(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  let subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    try {
      const rawAppKey = subscription.options?.applicationServerKey;
      const currentKeyBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const matches = Boolean(
        rawAppKey &&
          new Uint8Array(rawAppKey).length === currentKeyBytes.length &&
          new Uint8Array(rawAppKey).every((v, i) => v === currentKeyBytes[i])
      );
      if (!matches) {
        await subscription.unsubscribe();
        subscription = null;
      }
    } catch (keyErr) {
      console.warn('[Push] Error validating subscription key, renewing:', keyErr);
      await subscription?.unsubscribe().catch(() => {});
      subscription = null;
    }
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as any,
    });
  }
  return subscription;
}

/**
 * Abonne le navigateur courant aux notifications Web Push et enregistre le jeton côté serveur.
 */
export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  if (!isPushSupported() || !isSupabaseConfigured) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await resolveValidBrowserSubscription(registration);
    if (!subscription) return null;

    const headers = await getPushAuthHeaders();
    if (!headers) {
      console.warn('[Push] Session absente, enregistrement reporté.');
      return null;
    }

    const subscriptionJSON = subscription.toJSON();
    const registerResponse = await fetch(`${PUSH_API_URL}/push/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        // Conservé pour compatibilité ascendante avec les anciens serveurs.
        user_id: userId,
        endpoint: subscription.endpoint,
        keys_p256dh: subscriptionJSON.keys?.p256dh || '',
        keys_auth: subscriptionJSON.keys?.auth || '',
        user_agent: navigator.userAgent,
      }),
    });

    const registerResult = await registerResponse
      .json()
      .catch(() => ({ success: false, message: 'Réponse invalide du serveur' }));

    if (!registerResponse.ok || !registerResult.success) {
      console.error(
        '[Push] Échec enregistrement sur le serveur:',
        registerResult.message || registerResponse.status
      );
      return null;
    }

    return subscription;
  } catch (err) {
    console.error('[Push] Subscription failed:', err);
    return null;
  }
}

/**
 * Désabonne le navigateur courant et supprime son endpoint de `push_subscriptions`.
 */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  if (!isPushSupported() || !isSupabaseConfigured) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const { error } = await (supabase.from('push_subscriptions' as any) as any)
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint);
      if (error) {
        console.warn('[Push] Erreur suppression abonnement:', error.message);
      }
      await subscription.unsubscribe();
    }

    return true;
  } catch (err) {
    console.error('[Push] Unsubscribe failed:', err);
    return false;
  }
}
