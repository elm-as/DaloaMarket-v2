import React, { useState } from 'react';
import { ShieldAlert, Wrench, CreditCard, Save, RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AdminIpBanSection } from './AdminIpBanSection';

export function AdminSettingsTab() {
  const { maintenance, paymentConfig, loading, refreshSettings } = useSystemSettings();

  // Local state for editing maintenance mode
  const [maintEnabled, setMaintEnabled] = useState<boolean | null>(null);
  const [maintMessage, setMaintMessage] = useState<string | null>(null);
  const [maintReopening, setMaintReopening] = useState<string | null>(null);

  // Local state for editing payment status
  const [payStatus, setPayStatus] = useState<'normal' | 'degraded' | 'down' | null>(null);
  const [payNotice, setPayNotice] = useState<string | null>(null);
  const [disableOnline, setDisableOnline] = useState<boolean | null>(null);

  const [savingMaint, setSavingMaint] = useState(false);
  const [savingPay, setSavingPay] = useState(false);
  const [syncingPayouts, setSyncingPayouts] = useState(false);

  // Synchronize local states with loaded values
  const activeMaintEnabled = maintEnabled !== null ? maintEnabled : maintenance.enabled;
  const activeMaintMessage = maintMessage !== null ? maintMessage : maintenance.message;
  const activeMaintReopening = maintReopening !== null ? maintReopening : maintenance.expected_reopening || '';

  const activePayStatus = payStatus !== null ? payStatus : paymentConfig.status;
  const activePayNotice = payNotice !== null ? payNotice : paymentConfig.notice;
  const activeDisableOnline = disableOnline !== null ? disableOnline : paymentConfig.disable_online_payments;

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

  // Trigger Manual Payout Sync with Railway API
  const handleTriggerPayoutSync = async () => {
    setSyncingPayouts(true);
    try {
      const apiUrl = import.meta.env.VITE_PAYMENT_API_URL || 'https://daloamarket-payments.up.railway.app';
      const res = await fetch(`${apiUrl}/process-payouts?force=true`);
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Synchronisation terminée : ${data.processed || 0} payout(s) traités.`);
      } else {
        toast.error(data.message || 'Erreur lors de la synchronisation des payouts');
      }
    } catch (err: any) {
      toast.error('API Paiement inaccessible : ' + (err.message || 'erreur réseau'));
    } finally {
      setSyncingPayouts(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Chargement de la configuration système...</div>;
  }

  return (
    <div className="space-y-6 pb-10">

      {/* SECTION 1 : MODE MAINTENANCE */}
      <Card className="p-6 rounded-2xl border border-gray-100 shadow-elevation-1">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeMaintEnabled ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Mode Maintenance Global</h2>
              <p className="text-xs text-gray-500">Bascule le site en écran de maintenance pour tous les utilisateurs sauf les admins.</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={activeMaintEnabled}
              onChange={(e) => setMaintEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {activeMaintEnabled && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Attention : Le mode maintenance est actuellement ACTIF. Seuls les Administrateurs peuvent naviguer.</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Message personnalisé de maintenance
            </label>
            <textarea
              rows={3}
              value={activeMaintMessage}
              onChange={(e) => setMaintMessage(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              placeholder="Ex: Mise à jour technique importante en cours..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span>Date et heure de réouverture estimée (Optionnel)</span>
            </label>
            <input
              type="datetime-local"
              value={activeMaintReopening ? activeMaintReopening.slice(0, 16) : ''}
              onChange={(e) => setMaintReopening(e.target.value)}
              className="text-xs sm:text-sm p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveMaintenance}
              disabled={savingMaint}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {savingMaint ? 'Enregistrement...' : 'Sauvegarder Maintenance'}
            </Button>
          </div>
        </div>
      </Card>

      {/* SECTION 2 : URGENCE & STATUT DES PAIEMENTS MOBILE MONEY */}
      <Card className="p-6 rounded-2xl border border-gray-100 shadow-elevation-1">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Urgences & Statut Passerelle Paiement (MoneyFusion)</h2>
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

      {/* SECTION 3 : ACTIONS DE SECOURS DE SYNCHRONISATION */}
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

      {/* SECTION 4 : GESTION DES BANNISSEMENTS IP */}
      <AdminIpBanSection />

    </div>
  );
}
