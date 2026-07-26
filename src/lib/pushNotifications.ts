import { supabase, isSupabaseConfigured } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

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
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get the current notification permission state.
 */
export function getPermissionState(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

/**
 * Get the active push subscription, if any.
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/**
 * Subscribe the current browser to push notifications and persist to Supabase.
 * Returns the PushSubscription on success, or null on failure.
 */
export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY || !isSupabaseConfigured) {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription first
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as any,
      });
    }

    // Extract keys from the subscription
    const subscriptionJSON = subscription.toJSON();
    const endpoint = subscription.endpoint;
    const keys_p256dh = subscriptionJSON.keys?.p256dh || '';
    const keys_auth = subscriptionJSON.keys?.auth || '';

    // Persist to Supabase (upsert to handle re-subscriptions)
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint,
          keys_p256dh,
          keys_auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: 'user_id,endpoint' }
      );

    if (error) {
      console.error('[Push] Failed to save subscription:', error);
      return null;
    }

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
      await supabase
        .from('push_subscriptions')
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
 * Send a push notification via the Netlify function (admin only).
 * `target` is 'all' or an array of user IDs.
 */
export async function sendPushNotification(params: {
  target: 'all' | string[];
  title: string;
  body: string;
  url?: string;
  accessToken: string;
}): Promise<{ success: boolean; sent?: number; expired?: number; failed?: number; total?: number; error?: string }> {
  try {
    const response = await fetch('/.netlify/functions/send-push-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.accessToken}`,
      },
      body: JSON.stringify({
        target: params.target,
        title: params.title,
        body: params.body,
        url: params.url || '/',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Unknown error' };
    }
    return data;
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
