import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

/**
 * Initialise les notifications push natives (Capacitor Android/iOS) pour l'utilisateur connecté.
 */
export function useCapacitorPush(userId?: string) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !userId) return;

    const initCapacitorPush = async () => {
      try {
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt') {
          perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive !== 'granted') return;

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
          try {
            await (supabase.from('push_subscriptions' as any) as any).upsert(
              {
                user_id: userId,
                platform: 'android',
                token: token.value,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,platform' }
            );
          } catch (err) {
            console.warn('[Capacitor Push] Token sync error:', err);
          }
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          toast(
            () => (
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-xs font-extrabold text-gray-900">
                    {notification.title}
                  </span>
                  <span className="line-clamp-2 text-[11px] leading-tight text-gray-600">
                    {notification.body}
                  </span>
                </div>
              </div>
            ),
            { duration: 6000 }
          );
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const data = action.notification.data;
          const targetUrl = data?.url || data?.link;
          if (targetUrl) navigate(targetUrl);
        });
      } catch (err) {
        console.warn('[Capacitor Push] Init error:', err);
      }
    };

    initCapacitorPush();
  }, [userId, navigate]);
}
