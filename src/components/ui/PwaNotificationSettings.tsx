import React from 'react';
import { Bell, CheckCircle2, AlertCircle, Send, ShieldCheck, Smartphone } from 'lucide-react';
import { usePwaNotifications } from '../../hooks/usePwaNotifications';
import { Card } from './Card';
import { Button } from './Button';

export const PwaNotificationSettings: React.FC = () => {
  const {
    permission,
    isSubscribed,
    loading,
    isSupported,
    enableNotifications,
    disableNotifications,
    triggerSwNotification,
  } = usePwaNotifications();

  if (!isSupported) {
    return (
      <Card className="p-5 rounded-2xl border border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3 text-gray-500">
          <Smartphone className="w-5 h-5 flex-shrink-0" />
          <p className="text-xs font-semibold">
            Les notifications PWA ne sont pas prises en charge par ce navigateur ou appareil.
          </p>
        </div>
      </Card>
    );
  }

  const handleTestClick = async () => {
    await triggerSwNotification('🔔 Test Notification PWA DaloaMarket', {
      body: 'Votre application PWA est parfaitement configurée pour recevoir les alertes en temps réel à Daloa !',
      data: { url: '/' },
    });
  };

  return (
    <Card className="p-6 rounded-3xl border border-gray-100 shadow-elevation-1 bg-white">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary-50)] text-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[var(--color-on-surface)]">
              Notifications PWA en temps réel
            </h3>
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              Alertes instantanées pour vos commandes, messages et offres.
            </p>
          </div>
        </div>

        {permission === 'granted' && isSubscribed ? (
          <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Activées
          </span>
        ) : (
          <span className="text-[11px] font-extrabold text-amber-700 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Inactives
          </span>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 mb-5 text-xs text-gray-700 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" />
          <span>Ce que vous recevrez :</span>
        </div>
        <ul className="space-y-1.5 pl-6 list-disc text-gray-600 font-medium">
          <li>Alertes lors de la réception d'un nouveau message d'acheteur/vendeur.</li>
          <li>Notifications sur le suivi et les changements de statut de vos commandes.</li>
          <li>Annonces importantes et offres exclusives DaloaMarket.</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        {permission === 'granted' && isSubscribed ? (
          <>
            <Button
              variant="outlined"
              size="sm"
              fullWidth
              onClick={handleTestClick}
              icon={<Send className="w-4 h-4" />}
              className="border-gray-300 text-gray-700 hover:bg-gray-100 font-bold"
            >
              Envoyer un test
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="sm"
              fullWidth
              loading={loading}
              onClick={disableNotifications}
              className="font-bold"
            >
              Désactiver
            </Button>
          </>
        ) : (
          <Button
            size="md"
            fullWidth
            loading={loading}
            onClick={enableNotifications}
            icon={<Bell className="w-4 h-4" />}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-600)] text-white font-extrabold shadow-elevation-1 rounded-2xl"
          >
            Activer les notifications PWA
          </Button>
        )}
      </div>
    </Card>
  );
};
