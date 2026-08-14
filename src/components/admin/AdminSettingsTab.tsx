import React, { useState } from 'react';
import { ShieldAlert, Wrench, CreditCard, Save, RefreshCw, AlertTriangle, CheckCircle2, Clock, Ban, XOctagon } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AdminIpBanSection } from './AdminIpBanSection';

export function AdminSettingsTab() {
  const { maintenance, paymentConfig, cancellationSettings, loading, refreshSettings } = useSystemSettings();

  // Local state for editing maintenance mode
  const [maintEnabled, setMaintEnabled] = useState<boolean | null>(null);
  const [maintMessage, setMaintMessage] = useState<string | null>(null);
  const [maintReopening, setMaintReopening] = useState<string | null>(null);

  // Local state for editing payment status
  const [payStatus, setPayStatus] = useState<'normal' | 'degraded' | 'down' | null>(null);
  const [payNotice, setPayNotice] = useState<string | null>(null);
  const [disableOnline, setDisableOnline] = useState<boolean | null>(null);

  // Local state for editing cancellation anti-abuse settings
  const [cancelMax, setCancelMax] = useState<number | null>(null);
  const [cancelEnabled, setCancelEnabled] = useState<boolean | null>(null);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);

  const [savingMaint, setSavingMaint] = useState(false);
  const [savingPay, setSavingPay] = useState(false);
  const [savingCancel, setSavingCancel] = useState(false);
  const [syncingPayouts, setSyncingPayouts] = useState(false);

  // Synchronize local states with loaded values
  const activeMaintEnabled = maintEnabled !== null ? maintEnabled : maintenance.enabled;
  const activeMaintMessage = maintMessage !== null ? maintMessage : maintenance.message;
  const activeMaintReopening = maintReopening !== null ? maintReopening : maintenance.expected_reopening || '';

  const activePayStatus = payStatus !== null ? payStatus : paymentConfig.status;
  const activePayNotice = payNotice !== null ? payNotice : paymentConfig.notice;
  const activeDisableOnline = disableOnline !== null ? disableOnline : paymentConfig.disable_online_payments;

  const activeCancelMax = cancelMax !== null ? cancelMax : (cancellationSettings?.max_consecutive_cancellations ?? 3);
  const activeCancelEnabled = cancelEnabled !== null ? cancelEnabled : (cancellationSettings?.enabled ?? true);
  const activeCancelNotice = cancelNotice !== null ? cancelNotice : (cancellationSettings?.notice ?? 'Vous avez atteint la limite de 3 annulations consécutives. Afin de limiter les frais de remboursement, veuillez contacter le support pour toute demande d\'annulation.');

  // Save Maintenance Settings
  const handleSaveMaintenance = async () => {
    setSavingMaint(true);
    try {
      const payload = {
        enabled: activeMaintEnabled,
        expected_reopening: activeMaintReopening ? activeMaintReopening : null,
        message: activeMaintMessage,
      };

      const { data, error } = await (supabase.rpc as any)('update_system_setting', {
        p_key: 'maintenance_mode',
        p_value: payload,
      });

      if (error) throw error;
      const resData = data as any;
      if (resData && resData.success === false) throw new Error(resData.reason || 'Erreur modification');

      toast.success(activeMaintEnabled ? 'Mode maintenance ACTIVÉ' : 'Mode maintenance DÉSACTIVÉ');
      refreshSettings();
    } catch (err: any) {
      toast.error(err.message || 'Erreur mise à jour maintenance');
    } finally {
      setSavingMaint(false);
    }
  };

  // Save Payment Settings
  const handleSavePaymentConfig = async () => {
    setSavingPay(true);
    try {
      const payload = {
        status: activePayStatus,
        notice: activePayNotice,
        disable_online_payments: activeDisableOnline,
        force_cod_only: activeDisableOnline,
      };

      const { data, error } = await (supabase.rpc as any)('update_system_setting', {
        p_key: 'payment_settings',
        p_value: payload,
      });

      if (error) throw error;
      const resData = data as any;
      if (resData && resData.success === false) throw new Error(resData.reason || 'Erreur modification');

      toast.success('Paramètres de paiement mis à jour !');
      refreshSettings();
    } catch (err: any) {
      toast.error(err.message || 'Erreur mise à jour statut paiements');
    } finally {
      setSavingPay(false);
    }
  };

  // Save Cancellation Anti-Abuse Settings
  const handleSaveCancellationConfig = async () => {
    setSavingCancel(true);
    try {
      const payload = {
        max_consecutive_cancellations: Math.max(1, Number(activeCancelMax) || 3),
        enabled: activeCancelEnabled,
        notice: activeCancelNotice,
      };

      const { data, error } = await (supabase.rpc as any)('update_system_setting', {
        p_key: 'cancellation_settings',
        p_value: payload,
      });

      if (error) throw error;
      const resData = data as any;
      if (resData && resData.success === false) throw new Error(resData.reason || 'Erreur modification');

      toast.success('Paramètres anti-abus d\'annulations mis à jour !');
      refreshSettings();
    } catch (err: any) {
      toast.error(err.message || 'Erreur mise à jour paramètres annulation');
    } finally {
      setSavingCancel(false);
    }
  };

  // Trigger Manual Payout Sync with Railway API
  const handleTriggerPayoutSync = async () => {
    setSyncingPayouts(true);
    try {
      const apiUrl = import.meta.env.VITE_PAYMENT_API_URL || 'https://daloamarket-payments.up.railway.app';
      const res = await fetch(`${apiUrl}/process-payouts?force=true`);
      const data = await res.json();

      if (data.success) {
        toast.success(`Synchronisation terminée : ${data.processed || 0} versement(s) traité(s)`);
      } else {
        toast.error(data.message || 'Erreur lors de la synchronisation des versements');
      }
    } catch (err: any) {
      toast.error(err.message || 'Impossible de contacter le serveur de paiement');
    } finally {
      setSyncingPayouts(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1 : MODE MAINTENANCE */}
      <Card className="p-6 rounded-2xl border border-gray-100 shadow-elevation-1 bg-white">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Mode Maintenance Général</h2>
            <p className="text-xs text-gray-500">Bloque l'accès aux clients et affiche un écran d'indisponibilité temporaire.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
            <input
              type="checkbox"
              id="maintToggle"
              checked={activeMaintEnabled}
              onChange={(e) => setMaintEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="maintToggle" className="text-xs font-semibold text-gray-800 cursor-pointer">
              Activer le mode maintenance immédiat (Seuls les administrateurs pourront naviguer)
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Message d'explication affiché aux visiteurs
            </label>
            <textarea
              rows={3}
              value={activeMaintMessage}
              onChange={(e) => setMaintMessage(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
              placeholder="Ex: DaloaMarket est actuellement en maintenance pour une mise à jour technique..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Heure estimée de réouverture (Optionnel)
            </label>
            <input
              type="text"
              value={activeMaintReopening}
              onChange={(e) => setMaintReopening(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
              placeholder="Ex: Aujourd'hui à 16h30"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveMaintenance}
              disabled={savingMaint}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {savingMaint ? 'Enregistrement...' : 'Enregistrer Mode Maintenance'}
            </Button>
          </div>
        </div>
      </Card>

      {/* SECTION 2 : GESTION DES PANNES PAIEMENTS */}
      <Card className="p-6 rounded-2xl border border-gray-100 shadow-elevation-1 bg-white">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Statut de la Passerelle Mobile Money (MoneyFusion)</h2>
            <p className="text-xs text-gray-500">Gérez les pannes d'opérateur, affichez des avis de retard ou désactivez les paiements en ligne.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              État de la passerelle Mobile Money
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPayStatus('normal')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  activePayStatus === 'normal'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>100% Opérationnel</span>
              </button>

              <button
                type="button"
                onClick={() => setPayStatus('degraded')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  activePayStatus === 'degraded'
                    ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Ralentissement / Perturbé</span>
              </button>

              <button
                type="button"
                onClick={() => setPayStatus('down')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  activePayStatus === 'down'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Panne Majeure / Crash</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Message d'alerte ou de retard (Affiché aux acheteurs sur le checkout)
            </label>
            <input
              type="text"
              value={activePayNotice}
              onChange={(e) => setPayNotice(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Ex: Les réseaux Orange Money et MTN enregistrent des lenteurs. Vos retraits restent sécurisés."
            />
          </div>

          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
            <input
              type="checkbox"
              id="disableOnline"
              checked={activeDisableOnline}
              onChange={(e) => setDisableOnline(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="disableOnline" className="text-xs font-semibold text-gray-800 cursor-pointer">
              Désactiver temporairement les paiements Mobile Money (Mode maintenance des paiements)
            </label>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSavePaymentConfig}
              disabled={savingPay}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {savingPay ? 'Enregistrement...' : 'Enregistrer Statut Paiement'}
            </Button>
          </div>
        </div>
      </Card>

      {/* SECTION 3 : POLITIQUE ANTI-ABUS & FRAIS D'ANNULATION (MONEYFUSION) */}
      <Card className="p-6 rounded-2xl border border-gray-100 shadow-elevation-1 bg-white">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <XOctagon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Politique Anti-Abus & Limite d'Annulations Acheteur</h2>
            <p className="text-xs text-gray-500">
              Protège la plateforme contre l'accumulation des frais MoneyFusion (3% payin + 2.5% payout lors des remboursements intégraux).
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-3 bg-red-50/70 rounded-xl border border-red-100 text-xs text-red-800 leading-relaxed">
            <p className="font-bold mb-1">Fonctionnement du compteur :</p>
            <p>
              Tant que le livreur n'a pas encore récupéré le colis, l'acheteur peut annuler directement. Cependant, chaque annulation entraîne un remboursement intégral qui coûte ~5.5% de frais à la plateforme.
              Si un utilisateur atteint le nombre maximum d'annulations consécutives sans achat mené à son terme, ses futures annulations directes sont bloquées et nécessitent un contact avec le support.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Limite max d'annulations consécutives
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={activeCancelMax}
                onChange={(e) => setCancelMax(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-xs sm:text-sm p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
              <p className="text-[11px] text-gray-400 mt-1">Recommandé : 3 annulations d'affilée.</p>
            </div>

            <div className="flex items-center pt-5">
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 w-full">
                <input
                  type="checkbox"
                  id="cancelToggle"
                  checked={activeCancelEnabled}
                  onChange={(e) => setCancelEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                />
                <label htmlFor="cancelToggle" className="text-xs font-semibold text-gray-800 cursor-pointer">
                  Activer le verrouillage anti-abus automatique
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Message d'explication affiché à l'acheteur bloqué
            </label>
            <textarea
              rows={2}
              value={activeCancelNotice}
              onChange={(e) => setCancelNotice(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
              placeholder="Ex: Vous avez atteint la limite d'annulations consécutives..."
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveCancellationConfig}
              disabled={savingCancel}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {savingCancel ? 'Enregistrement...' : 'Enregistrer Paramètres Anti-Abus'}
            </Button>
          </div>
        </div>
      </Card>

      {/* SECTION 4 : ACTIONS DE SECOURS DE SYNCHRONISATION */}
      <Card className="p-6 rounded-2xl border border-gray-100 shadow-elevation-1 bg-slate-900 text-white">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Actions de Secours & Resync Payouts</h2>
            <p className="text-xs text-slate-400">En cas d'échec de webhook MoneyFusion, forcez la vérification des virements en attente.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-300 leading-relaxed max-w-lg">
            Cette commande interpelle le serveur Railway pour re-vérifier chaque transaction de versement en attente et retenter l'envoi vers MoneyFusion.
          </p>
          <Button
            onClick={handleTriggerPayoutSync}
            disabled={syncingPayouts}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${syncingPayouts ? 'animate-spin' : ''}`} />
            {syncingPayouts ? 'Synchronisation...' : 'Forcer Sync Payouts'}
          </Button>
        </div>
      </Card>

      {/* SECTION 5 : GESTION DES BANNISSEMENTS IP */}
      <AdminIpBanSection />

    </div>
  );
}
