import React, { useState } from 'react';
import {
  ShieldAlert,
  Wrench,
  CreditCard,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  XOctagon,
  Sliders,
  Sparkles,
  Truck,
  Store,
  Banknote,
  Check,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useSystemSettings, type PhaseConfig } from '../../hooks/useSystemSettings';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AdminIpBanSection } from './AdminIpBanSection';
import { cn } from '../../lib/utils';

export function AdminSettingsTab() {
  const {
    maintenance,
    paymentConfig,
    cancellationSettings,
    phaseConfig,
    loading,
    refreshSettings,
  } = useSystemSettings();

  // Local state for editing Phase Config
  const [phaseForm, setPhaseForm] = useState<PhaseConfig | null>(null);
  const [savingPhase, setSavingPhase] = useState(false);

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

  // Active values
  const activePhase = phaseForm !== null ? phaseForm : phaseConfig;

  const activeMaintEnabled = maintEnabled !== null ? maintEnabled : maintenance.enabled;
  const activeMaintMessage = maintMessage !== null ? maintMessage : maintenance.message;
  const activeMaintReopening = maintReopening !== null ? maintReopening : maintenance.expected_reopening || '';

  const activePayStatus = payStatus !== null ? payStatus : paymentConfig.status;
  const activePayNotice = payNotice !== null ? payNotice : paymentConfig.notice;
  const activeDisableOnline = disableOnline !== null ? disableOnline : paymentConfig.disable_online_payments;

  const activeCancelMax = cancelMax !== null ? cancelMax : (cancellationSettings?.max_consecutive_cancellations ?? 3);
  const activeCancelEnabled = cancelEnabled !== null ? cancelEnabled : (cancellationSettings?.enabled ?? true);
  const activeCancelNotice = cancelNotice !== null ? cancelNotice : (cancellationSettings?.notice ?? 'Vous avez atteint la limite de 3 annulations consécutives. Afin de limiter les frais de remboursement, veuillez contacter le support pour toute demande d\'annulation.');

  // Quick Preset Handlers for Phase 0 vs Phase 1
  const applyPresetPhase0 = () => {
    setPhaseForm({
      phase: 0,
      allow_cod_for_all: true,
      allow_pickup_for_all: true,
      allow_affiliated_deliverers_for_all: true,
      max_free_listings: 999999,
      enable_boost: true,
      enable_bump: true,
      enable_seller_badge: true,
      default_payment_method: 'cod',
    });
    toast.success('Préréglage Phase 0 (Lancement 100% libre & COD) sélectionné');
  };

  const applyPresetPhase1 = () => {
    setPhaseForm({
      phase: 1,
      allow_cod_for_all: false,
      allow_pickup_for_all: false,
      allow_affiliated_deliverers_for_all: false,
      max_free_listings: 20,
      enable_boost: true,
      enable_bump: true,
      enable_seller_badge: true,
      default_payment_method: 'online',
    });
    toast.success('Préréglage Phase 1 (Croissance & Monétisation Pro) sélectionné');
  };

  // Save Phase Settings
  const handleSavePhaseConfig = async () => {
    setSavingPhase(true);
    try {
      const { data, error } = await (supabase.rpc as any)('update_system_setting', {
        p_key: 'phase_config',
        p_value: activePhase,
      });

      if (error) throw error;
      const resData = data as any;
      if (resData && resData.success === false) throw new Error(resData.reason || 'Erreur modification');

      toast.success(
        activePhase.phase === 0
          ? 'Phase 0 (Lancement libre) enregistrée et active en temps réel !'
          : 'Phase 1 (Croissance Pro) enregistrée et active en temps réel !'
      );
      refreshSettings();
    } catch (err: any) {
      toast.error(err.message || 'Erreur mise à jour configuration de phase');
    } finally {
      setSavingPhase(false);
    }
  };

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
      {/* SECTION 0 : PILOTE DE STRATÉGIE & PHASE (COMMUTATEUR TEMPS RÉEL) */}
      <Card className="p-6 rounded-3xl border-2 border-orange-200 shadow-xl shadow-orange-500/10 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-gray-900">Pilote de Stratégie Marketplace</h2>
                <span
                  className={cn(
                    "text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full",
                    activePhase.phase === 0 ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"
                  )}
                >
                  {activePhase.phase === 0 ? 'Phase 0 : Lancement' : 'Phase 1 : Croissance'}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">Basculez les fonctionnalités en direct sans redéploiement.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={applyPresetPhase0}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-1.5",
                activePhase.phase === 0
                  ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Phase 0 (Lancement)</span>
            </button>
            <button
              type="button"
              onClick={applyPresetPhase1}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-1.5",
                activePhase.phase === 1
                  ? "bg-orange-500 text-white border-orange-600 shadow-sm"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phase 1 (Croissance)</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3.5">
            {/* Toggle 1: Paiement à la livraison pour tous */}
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Paiement à la livraison (COD) pour tous</span>
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">Permet à tout vendeur (même non Pro) de proposer le règlement en espèces.</p>
              </div>
              <input
                type="checkbox"
                checked={activePhase.allow_cod_for_all}
                onChange={(e) =>
                  setPhaseForm({
                    ...activePhase,
                    allow_cod_for_all: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 mt-0.5"
              />
            </div>

            {/* Toggle 2: Retrait boutique pour tous */}
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>Retrait boutique pour tous</span>
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">Permet aux acheteurs de choisir le Click & Collect sans frais.</p>
              </div>
              <input
                type="checkbox"
                checked={activePhase.allow_pickup_for_all}
                onChange={(e) =>
                  setPhaseForm({
                    ...activePhase,
                    allow_pickup_for_all: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 mt-0.5"
              />
            </div>

            {/* Toggle 3: Livreurs Affiliés pour tous */}
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Livreurs Personnels / Affiliés pour tous</span>
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">Débloque la gestion de livreurs habituels pour chaque commerçant.</p>
              </div>
              <input
                type="checkbox"
                checked={activePhase.allow_affiliated_deliverers_for_all}
                onChange={(e) =>
                  setPhaseForm({
                    ...activePhase,
                    allow_affiliated_deliverers_for_all: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 mt-0.5"
              />
            </div>

            {/* Toggle 4: Méthode par défaut */}
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-gray-700 shrink-0" />
                  <span>Paiement par défaut au Checkout</span>
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">Option pré-sélectionnée pour maximiser la conversion.</p>
              </div>
              <select
                value={activePhase.default_payment_method}
                onChange={(e) =>
                  setPhaseForm({
                    ...activePhase,
                    default_payment_method: e.target.value as 'cod' | 'online',
                  })
                }
                className="text-xs font-bold p-1.5 border border-gray-200 rounded-xl bg-white focus:outline-none"
              >
                <option value="cod">Paiement à la livraison (COD)</option>
                <option value="online">Paiement en ligne sécurisé</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSavePhaseConfig}
              disabled={savingPhase}
              size="sm"
              className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-extrabold shadow-md shadow-orange-500/20"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {savingPhase ? 'Enregistrement...' : 'Appliquer la Stratégie en Direct'}
            </Button>
          </div>
        </div>
      </Card>

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
              Message d'information pour les utilisateurs
            </label>
            <textarea
              rows={2}
              value={activeMaintMessage}
              onChange={(e) => setMaintMessage(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
              placeholder="Ex: DaloaMarket effectue une mise à jour technique. Retour prévu à 14h."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Estimation d'ouverture (Texte court optionnel)
            </label>
            <input
              type="text"
              value={activeMaintReopening}
              onChange={(e) => setMaintReopening(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
              placeholder="Ex: Aujourd'hui à 15h00"
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

      {/* SECTION 2 : ÉTAT DES PAIEMENTS & FORCE COD */}
      <Card className="p-6 rounded-2xl border border-gray-100 shadow-elevation-1 bg-white">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Passerelle de Paiement MoneyFusion</h2>
            <p className="text-xs text-gray-500">Contrôlez l'état des paiements en ligne et activez les bandeaux d'alerte.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Statut du service de paiement Mobile Money
            </label>
            <select
              value={activePayStatus || 'normal'}
              onChange={(e) => setPayStatus(e.target.value as any)}
              className="w-full text-xs sm:text-sm p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
            >
              <option value="normal">Opérationnel (Normal)</option>
              <option value="degraded">Dégradé (Ralentissements signalés)</option>
              <option value="down">Indisponible (Paiements en ligne coupés)</option>
            </select>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
            <input
              type="checkbox"
              id="disableOnlineToggle"
              checked={activeDisableOnline || false}
              onChange={(e) => setDisableOnline(e.target.checked)}
              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="disableOnlineToggle" className="text-xs font-semibold text-gray-800 cursor-pointer">
              Désactiver temporairement les paiements en ligne (Force le paiement en espèces / COD uniquement)
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Bannière d'information paiement (affichée lors du checkout si renseignée)
            </label>
            <input
              type="text"
              value={activePayNotice || ''}
              onChange={(e) => setPayNotice(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
              placeholder="Ex: Le réseau MTN MoMo subit des lenteurs nationales. Privilégiez Wave ou Orange."
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSavePaymentConfig}
              disabled={savingPay}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {savingPay ? 'Enregistrement...' : 'Enregistrer Paramètres Paiement'}
            </Button>
          </div>
        </div>
      </Card>

      {/* SECTION 3 : PARAMÈTRES ANTI-ABUS ANNULATIONS */}
      <Card className="p-6 rounded-2xl border border-gray-100 shadow-elevation-1 bg-white">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Anti-Abus Annulations Répétées</h2>
            <p className="text-xs text-gray-500">Configurez le seuil d'annulations consécutives avant de bloquer un acheteur.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nombre maximum d'annulations consécutives autorisées
              </label>
              <input
                type="number"
                min={1}
                max={10}
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
