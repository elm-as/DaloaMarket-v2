import { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabase } from './useSupabase';
import { supabase } from '../lib/supabase';
import {
  isPushSupported,
  getPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/pushNotifications';
import toast from 'react-hot-toast';

const NOTIF_OPT_OUT_KEY = 'daloamarket_notifs_opted_out';

export function usePwaNotifications() {
  const { user } = useSupabase();
  
  // Lecture synchrone de l'état initial
  const initialPermission = getPermissionState();
  const initialOptedOut = typeof window !== 'undefined' ? window.localStorage.getItem(NOTIF_OPT_OUT_KEY) === 'true' : false;
  const initialActive = initialPermission === 'granted' && !initialOptedOut;

  const [permission, setPermission] = useState<NotificationPermission>(initialPermission);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(initialActive);
  const [loading, setLoading] = useState<boolean>(false);
  const realtimeSubscribed = useRef<boolean>(false);

  // Check subscription status
  const checkStatus = useCallback(async () => {
    if (!isPushSupported()) return;
    const currentPermission = getPermissionState();
    setPermission(currentPermission);

    const isOptedOut = window.localStorage.getItem(NOTIF_OPT_OUT_KEY) === 'true';

    if (currentPermission === 'granted' && !isOptedOut) {
      setIsSubscribed(true);
      // Synchroniser en arrière-plan avec le Service Worker si disponible
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          if (registration && registration.pushManager) {
            await registration.pushManager.getSubscription();
          }
        }
      } catch {
        // Fallback silencieux
      }
    } else {
      setIsSubscribed(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Trigger SW Notification (avec fallback navigateur direct)
  const triggerSwNotification = useCallback(async (title: string, options: any) => {
    if (!isPushSupported() || Notification.permission !== 'granted') return;

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, {
            icon: '/web-app-manifest-192x192.png',
            badge: '/favicon-96x96.png',
            vibrate: [200, 100, 200],
            tag: `daloamarket-${Date.now()}`,
            renotify: true,
            ...options,
          });
          return;
        }
      }

      // Fallback Direct Notification API
      new Notification(title, {
        icon: '/web-app-manifest-192x192.png',
        ...options,
      });
    } catch (err) {
      console.warn('[PWA Notification Error]:', err);
      try {
        new Notification(title, {
          icon: '/web-app-manifest-192x192.png',
          ...options,
        });
      } catch (e) {
        console.error('[Notification Fallback Error]:', e);
      }
    }
  }, []);

  // Subscribe user to PWA push notifications
  const enableNotifications = async (): Promise<boolean> => {
    if (!isPushSupported()) {
      toast.error('Les notifications PWA ne sont pas supportées par votre navigateur.');
      return false;
    }

    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === 'granted') {
        window.localStorage.removeItem(NOTIF_OPT_OUT_KEY);
        setIsSubscribed(true);

        if (user) {
          try {
            await subscribeToPush(user.id);
          } catch (e) {
            console.warn('[Push] Background push subscribe skipped or failed:', e);
          }
        }

        toast.success('Notifications activées avec succès !');

        // Send confirmation test notification
        await triggerSwNotification('DaloaMarket : Notifications Activées 🔔', {
          body: 'Vous recevrez vos alertes de commandes et messages en temps réel.',
          data: { url: '/' },
        });

        return true;
      } else if (perm === 'denied') {
        toast.error('Notifications bloquées dans les paramètres de votre navigateur.');
        setIsSubscribed(false);
        return false;
      } else {
        return false;
      }
    } catch (err) {
      console.error('Erreur activation push PWA:', err);
      toast.error("Échec de l'activation des notifications.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Unsubscribe user
  const disableNotifications = async (): Promise<boolean> => {
    setLoading(true);
    try {
      window.localStorage.setItem(NOTIF_OPT_OUT_KEY, 'true');
      setIsSubscribed(false);

      if (user) {
        try {
          await unsubscribeFromPush(user.id);
        } catch (e) {
          console.warn('[Push] Unsubscribe DB skipped:', e);
        }
      }

      toast.success('Notifications désactivées.');
      return true;
    } catch {
      toast.error('Erreur lors de la désactivation.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Test Notification
  const sendTestNotification = async () => {
    if (permission !== 'granted') {
      toast.error("Veuillez d'abord activer les notifications.");
      return;
    }
    toast.success('Notification de test envoyée !');
    await triggerSwNotification('🔔 Test Notification DaloaMarket', {
      body: 'Ceci est un test de notification en temps réel. Tout fonctionne à merveille !',
      data: { url: '/' },
    });
  };

  // Listen to Supabase Realtime for Messages, Orders, and Admin Notifications
  useEffect(() => {
    if (!user || permission !== 'granted' || realtimeSubscribed.current) return;

    realtimeSubscribed.current = true;
    const channelId = `pwa_notifs_${user.id}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase.channel(channelId);

    // 1. Listen to new Chat Messages
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      },
      (payload) => {
        const msg = payload.new;
        if (msg) {
          triggerSwNotification('💬 Nouveau message DaloaMarket', {
            body: msg.content ? (msg.content.length > 60 ? `${msg.content.slice(0, 60)}...` : msg.content) : 'Vous avez reçu un nouveau message.',
            data: { url: `/messages/${msg.listing_id}/${msg.sender_id}` },
          });
        }
      }
    );

    // 2. Listen to Order Status Changes (for Buyer)
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `buyer_id=eq.${user.id}`,
      },
      (payload) => {
        const order = payload.new;
        if (order) {
          let statusText = 'Votre commande a été mise à jour.';
          if (order.status === 'paid') statusText = 'Paiement confirmé ! Votre commande est en préparation.';
          else if (order.status === 'picked_up') statusText = 'Le livreur a récupéré votre colis et fait route vers vous.';
          else if (order.status === 'delivered') statusText = 'Colis livré avec succès ! Merci de votre confiance.';
          else if (order.status === 'disputed') statusText = 'Litige ouvert sur votre commande. Notre support intervient.';

          triggerSwNotification('📦 Mise à jour de votre commande', {
            body: statusText,
            data: { url: `/suivi/${order.id}` },
          });
        }
      }
    );

    // 3. Listen to Order Status Changes (for Seller)
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `seller_id=eq.${user.id}`,
      },
      (payload) => {
        const order = payload.new;
        if (order) {
          let statusText = 'Changement de statut sur une de vos ventes.';
          if (order.status === 'paid') statusText = 'Nouvelle vente confirmée ! Préparez le colis pour le livreur.';
          else if (order.status === 'delivered') statusText = 'Livraison validée par l\'acheteur ! Vos gains sont disponibles.';

          triggerSwNotification('🛍️ Notification Vendeur DaloaMarket', {
            body: statusText,
            data: { url: `/mes-commandes` },
          });
        }
      }
    );

    // 4. Listen to Admin Notifications
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      (payload) => {
        const notif = payload.new;
        if (notif) {
          triggerSwNotification(notif.title || 'DaloaMarket', {
            body: notif.body || '',
            data: { url: notif.url || '/' },
          });
        }
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      realtimeSubscribed.current = false;
    };
  }, [user, permission, triggerSwNotification]);

  return {
    permission,
    isSubscribed,
    loading,
    isSupported: isPushSupported(),
    enableNotifications,
    disableNotifications,
    triggerSwNotification,
    sendTestNotification,
    checkStatus,
  };
}
