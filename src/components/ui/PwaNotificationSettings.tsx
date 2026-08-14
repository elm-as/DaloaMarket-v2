import React from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Send,
  RefreshCw,
  Info,
} from 'lucide-react';
import { usePwaNotifications } from '../../hooks/usePwaNotifications';
import { cn } from '../../lib/utils';

export const PwaNotificationSettings: React.FC = () => {
  const {
    permission,
    isSubscribed,
    loading,
    isSupported,
    enableNotifications,
    disableNotifications,
    sendTestNotification,
    checkStatus,
  } = usePwaNotifications();

  if (!isSupported) {
    return (
      <div className="p-5 rounded-3xl border border-gray-100 bg-white shadow-lg shadow-gray-200/50">
        <div className="flex items-center gap-3 text-gray-500">
          <Smartphone className="w-5 h-5 flex-shrink-0" />
          <p className="text-xs font-semibold">
            Les notifications ne sont pas supportées par ce navigateur.
          </p>
        </div>
      </div>
    );
  }

  const isActive = permission === 'granted' && isSubscribed;
  const isDenied = permission === 'denied';

  const handleToggle = async () => {
    if (loading) return;
    if (isActive) {
      await disableNotifications();
    } else {
      await enableNotifications();
    }
  };

  return (
    <div className="p-5 rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 bg-white space-y-4">
      {/* Header with Title & iOS-Style Switch */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors',
              isActive
                ? 'bg-emerald-50 text-emerald-600'
                : isDenied
                ? 'bg-red-50 text-red-500'
                : 'bg-orange-50 text-orange-600'
            )}
          >
            <Bell className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-gray-900 truncate">
                Notifications en temps réel
              </h3>
              {isActive && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  <CheckCircle2 className="w-3 h-3" /> Activées
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">
              Messages, suivi des commandes et alertes
            </p>
          </div>
        </div>

        {/* Interactive Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          disabled={loading || isDenied}
          onClick={handleToggle}
          className={cn(
            'relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40',
            isActive ? 'bg-emerald-500' : 'bg-gray-200'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
              isActive ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>
      </div>

      {/* When Permissions are Denied in Browser */}
      {isDenied && (
        <div className="p-3.5 bg-red-50/80 border border-red-200/70 rounded-2xl text-xs text-red-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-red-900">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>Notifications bloquées par votre navigateur</span>
          </div>
          <p className="text-[11px] text-red-700 leading-relaxed">
            Pour recevoir vos alertes, cliquez sur le cadenas 🔒 à gauche de la barre d'adresse de votre navigateur et autorisez les « Notifications ».
          </p>
          <button
            type="button"
            onClick={checkStatus}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-800 text-[11px] font-extrabold rounded-xl border border-red-200 shadow-2xs hover:bg-red-50 active:scale-95 transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Vérifier à nouveau</span>
          </button>
        </div>
      )}

      {/* Informative Content & Test Notification */}
      {isActive && (
        <div className="pt-2.5 flex items-center justify-between border-t border-gray-100 text-xs">
          <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
            <Info className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="truncate">Alertes actives en direct</span>
          </div>
          <button
            type="button"
            onClick={sendTestNotification}
            className="inline-flex items-center gap-1 text-xs font-extrabold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl active:scale-95 transition-all"
          >
            <Send className="w-3 h-3" />
            <span>Envoyer un test</span>
          </button>
        </div>
      )}
    </div>
  );
};

