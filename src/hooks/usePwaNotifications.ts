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

export function usePwaNotifications() {
  const { user } = useSupabase();
  const [permission, setPermission] = useState<NotificationPermission>(getPermissionState());
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const realtimeSubscribed = useRef<boolean>(false);

  // Check subscription status
  const checkStatus = useCallback(async () => {
    if (!isPushSupported()) return;
    const currentPermission = getPermissionState();
    setPermission(currentPermission);

    if (currentPermission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      } catch {
        setIsSubscribed(false);
      }
    } else {
      setIsSubscribed(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Trigger SW Notification
  const triggerSwNotification = useCallback(async (title: string, options: any) => {
    if (!isPushSupported() || Notification.permission !== 'granted') return;

    try {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification(title, {
        icon: '/web-app-manifest-192x192.png',
        badge: '/favicon-96x96.png',
        vibrate: [200, 100, 200],
        tag: `daloamarket-${Date.now()}`,
        renotify: true,
        ...options,
      });
    } catch (err) {
      console.warn('[PWA Notification Error]:', err);
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
        if (user) {
          await subscribeToPush(user.id);
        }
        setIsSubscribed(true);
        toast.success('Notifications PWA activées avec succès !');

        // Send confirmation test notification
        await triggerSwNotification('DaloaMarket Notifications Activées', {
          body: 'Vous recevrez désormais vos alertes de commandes et de messages en temps réel.',
          data: { url: '/' },
        });

        return true;
      } else {
        toast.error('Permission de notification refusée par le navigateur.');
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
    if (!user) return false;
    setLoading(true);
    try {
      await unsubscribeFromPush(user.id);
      setIsSubscribed(false);
      toast.success('Notifications PWA désactivées.');
      return true;
    } catch {
      toast.error('Erreur lors de la désactivation.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Listen to Supabase Realtime for Messages, Orders, and Admin Notifications
  useEffect(() => {
    if (!user || permission !== 'granted' || realtimeSubscribed.current) return;

    realtimeSubscribed.current = true;
    const channelId = `pwa_notifs_${user.id}_${Date.now()}`;
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
  };
}
