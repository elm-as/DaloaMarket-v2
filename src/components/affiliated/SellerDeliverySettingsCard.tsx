import React from 'react';
import { Truck, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { SellerDeliverySettings } from '../../services/affiliatedDeliverersService';

interface SellerDeliverySettingsCardProps {
  settings: SellerDeliverySettings;
  savingSettings: boolean;
  onToggleSetting: (key: 'home_delivery_enabled' | 'cash_on_delivery_enabled') => void;
}

export const SellerDeliverySettingsCard: React.FC<SellerDeliverySettingsCardProps> = ({
  settings,
  savingSettings,
  onToggleSetting,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-xs">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900">Paramètres d'Expédition</h2>
            <p className="text-xs text-gray-400 font-medium">Contrôlez les options proposées aux acheteurs</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-1">
        {/* Toggle 1: Livraison à Domicile */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/80 border border-gray-100 hover:border-gray-200 transition-all gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-gray-900">Livraison à domicile</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                Daloa
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Permet aux acheteurs de se faire livrer directement à domicile ou au bureau.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={settings.home_delivery_enabled}
            onClick={() => onToggleSetting('home_delivery_enabled')}
            disabled={savingSettings}
            className={cn(
              "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner",
              settings.home_delivery_enabled ? "bg-orange-500" : "bg-gray-300"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out",
                settings.home_delivery_enabled ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>

        {/* Toggle 2: Paiement à la livraison (COD) */}
        <div className={cn(
          "flex items-center justify-between p-4 rounded-2xl border transition-all gap-4",
          !settings.home_delivery_enabled
            ? "opacity-50 bg-gray-50 border-gray-200 pointer-events-none"
            : "bg-emerald-50/50 border-emerald-100/80 hover:border-emerald-200"
        )}>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <p className="text-sm font-black text-gray-900">
                Paiement à la livraison (Cash on Delivery)
              </p>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Exclusif Affiliés
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Les acheteurs peuvent payer en espèces ou Mobile Money lors de la réception de leur colis par vos livreurs affiliés.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={settings.cash_on_delivery_enabled}
            onClick={() => onToggleSetting('cash_on_delivery_enabled')}
            disabled={savingSettings || !settings.home_delivery_enabled}
            className={cn(
              "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner",
              settings.cash_on_delivery_enabled ? "bg-emerald-600" : "bg-gray-300"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out",
                settings.cash_on_delivery_enabled ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>

        {/* Explication règles de diffusion */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-blue-900 text-xs space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-2 font-black text-blue-950">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Fonctionnement de la diffusion des courses :</span>
          </div>
          <ul className="space-y-1 pl-6 list-disc text-blue-800/90 font-medium">
            <li><span className="font-bold">Commandes Payées en Ligne (Escrow) :</span> Ouvertes à l'ensemble des livreurs DaloaDelivery (y compris vos affiliés).</li>
            <li><span className="font-bold">Commandes Cash on Delivery (COD) :</span> Diffusées <u>exclusivement</u> à vos livreurs affiliés pour une sécurité financière totale.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
