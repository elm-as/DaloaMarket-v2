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
      seller_fee_override: 0,
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
      seller_fee_override: null,
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

          {/* ── Monétisation & Visibilité ─────────────────────────── */}
          <div className="pt-3 mt-1 border-t border-gray-100">
            <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              Monétisation & Visibilité
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Toggle: Boost d'annonces */}
              <div className={cn(
                "p-3.5 rounded-2xl border flex items-start justify-between gap-3 transition-colors",
                activePhase.enable_boost ? "bg-orange-50/60 border-orange-200" : "bg-gray-50 border-gray-100"
              )}>
                <div>
                  <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>Boost d'annonces</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Mise en avant prioritaire payante (badge « Sponsorisé »).</p>
                </div>
                <input
                  type="checkbox"
                  checked={activePhase.enable_boost}
                  onChange={(e) =>
                    setPhaseForm({
                      ...activePhase,
                      enable_boost: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 mt-0.5"
                />
              </div>

              {/* Toggle: Bump de visibilité */}
              <div className={cn(
                "p-3.5 rounded-2xl border flex items-start justify-between gap-3 transition-colors",
                activePhase.enable_bump ? "bg-blue-50/60 border-blue-200" : "bg-gray-50 border-gray-100"
              )}>
                <div>
                  <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Bump de visibilité</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Remonter une annonce en tête du flux (payant).</p>
                </div>
                <input
                  type="checkbox"
                  checked={activePhase.enable_bump}
                  onChange={(e) =>
                    setPhaseForm({
                      ...activePhase,
                      enable_bump: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mt-0.5"
                />
              </div>

              {/* Toggle: Badge Vendeur Pro */}
              <div className={cn(
                "p-3.5 rounded-2xl border flex items-start justify-between gap-3 transition-colors",
                activePhase.enable_seller_badge ? "bg-emerald-50/60 border-emerald-200" : "bg-gray-50 border-gray-100"
              )}>
                <div>
                  <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Badge Vendeur Pro</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Abonnement Pro avec badge vérifié et avantages.</p>
                </div>
                <input
                  type="checkbox"
                  checked={activePhase.enable_seller_badge}
                  onChange={(e) =>
                    setPhaseForm({
                      ...activePhase,
                      enable_seller_badge: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
              </div>
            </div>
          </div>

          {/* ── Limites & Commission ─────────────────────────── */}
          <div className="pt-3 mt-1 border-t border-gray-100">
            <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-gray-400" />
              Limites & Commission
            </p>
            <div className="grid sm:grid-cols-2 gap-3.5">
              {/* Max annonces gratuites */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                <p className="text-xs font-bold text-gray-900">Max annonces gratuites par vendeur</p>
                <p className="text-[11px] text-gray-500">Au-delà, le vendeur doit acheter un pack ou passer Pro.</p>
                <input
                  type="number"
                  min={1}
                  value={activePhase.max_free_listings >= 999999 ? '' : activePhase.max_free_listings}
                  placeholder="Illimité"
                  onChange={(e) => {
                    const val = e.target.value === '' ? 999999 : Math.max(1, parseInt(e.target.value) || 1);
                    setPhaseForm({ ...activePhase, max_free_listings: val });
                  }}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none font-bold"
                />
              </div>

              {/* Override commission vendeur */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                <p className="text-xs font-bold text-gray-900">Commission vendeur (override)</p>
                <p className="text-[11px] text-gray-500">Laisser vide = taux par défaut. Mettre 0 = 0% (Phase 0 gratuit).</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={activePhase.seller_fee_override !== null ? activePhase.seller_fee_override : ''}
                    placeholder="Défaut"
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                      setPhaseForm({ ...activePhase, seller_fee_override: val });
                    }}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none font-bold"
                  />
                  <span className="text-xs font-bold text-gray-500 shrink-0">%</span>
                </div>
              </div>
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

      {/* ========================================================================= */}
      {/* SECTION DU BAS : CONFIGURATION SYSTÈME, PAIEMENT, SÉCURITÉ & ANTI-ABUS */}
      {/* ========================================================================= */}
      <div className="pt-2">
        <div className="flex items-center gap-2.5 mb-4">
          <Sliders className="w-5 h-5 text-orange-600" />
          <div>
            <h3 className="text-base font-black text-gray-900 tracking-tight">Paramètres Système, Sécurité & Urgences</h3>
            <p className="text-xs text-gray-500">Contrôle de la maintenance, des flux de paiement, de l'anti-abus et des accès réseau.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* SECTION 1 : MODE MAINTENANCE */}
          <Card className="p-6 rounded-3xl border border-gray-200/80 shadow-xs bg-white space-y-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-11 h-11 rounded-2xl flex items-center justify-center transition-colors',
                  activeMaintEnabled ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                )}>
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-gray-900">Mode Maintenance Général</h2>
                  <p className="text-xs text-gray-500">Bloque l'accès aux clients avec écran d'indisponibilité.</p>
                </div>
              </div>

              {/* Status Indicator Badge */}
              <span className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold',
                activeMaintEnabled ? 'bg-orange-100 text-orange-800 border border-orange-200 animate-pulse' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full', activeMaintEnabled ? 'bg-orange-600' : 'bg-emerald-600')} />
                {activeMaintEnabled ? 'Maintenance Active' : 'Site En Ligne'}
              </span>
            </div>

            <div className="space-y-4">
              {/* Interactive Switch Toggle */}
              <div className={cn(
                'flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer',
                activeMaintEnabled ? 'bg-orange-50/70 border-orange-200' : 'bg-gray-50/70 border-gray-200/80 hover:bg-gray-100/60'
              )}
              onClick={() => setMaintEnabled(!activeMaintEnabled)}
              >
                <div className="flex flex-col pr-4">
                  <span className="text-xs font-bold text-gray-900">Activer le mode maintenance immédiat</span>
                  <span className="text-[11px] text-gray-500">Seuls les administrateurs connectés pourront naviguer</span>
                </div>
                {/* Switch Graphic */}
                <div className={cn(
                  'w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0',
                  activeMaintEnabled ? 'bg-orange-600' : 'bg-gray-300'
                )}>
                  <div className={cn(
                    'bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out',
                    activeMaintEnabled ? 'translate-x-5' : 'translate-x-0'
                  )} />
                </div>
              </div>

              {/* Message Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Message d'information pour les utilisateurs
                </label>
                <textarea
                  rows={2}
                  value={activeMaintMessage}
                  onChange={(e) => setMaintMessage(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none bg-gray-50/50"
                  placeholder="Ex: DaloaMarket effectue une mise à jour technique. Retour prévu très rapidement !"
                />
              </div>

              {/* Estimation */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Estimation d'ouverture (Texte court optionnel)
                </label>
                <input
                  type="text"
                  value={activeMaintReopening}
                  onChange={(e) => setMaintReopening(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none bg-gray-50/50 font-medium"
                  placeholder="Ex: Aujourd'hui à 15h00 ou 2026-08-20T14:00"
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleSaveMaintenance}
                  disabled={savingMaint}
                  size="sm"
                  className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {savingMaint ? 'Enregistrement...' : 'Enregistrer Mode Maintenance'}
                </Button>
              </div>
            </div>
          </Card>

          {/* SECTION 2 : ÉTAT DES PAIEMENTS & FORCE COD */}
          <Card className="p-6 rounded-3xl border border-gray-200/80 shadow-xs bg-white space-y-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-gray-900">Passerelle de Paiement MoneyFusion</h2>
                  <p className="text-xs text-gray-500">Contrôlez l'état des paiements en ligne et alertes.</p>
                </div>
              </div>

              <span className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold',
                activePayStatus === 'down' ? 'bg-red-100 text-red-800 border border-red-200' :
                activePayStatus === 'degraded' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                'bg-emerald-100 text-emerald-800 border border-emerald-200'
              )}>
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  activePayStatus === 'down' ? 'bg-red-600' : activePayStatus === 'degraded' ? 'bg-amber-600' : 'bg-emerald-600'
                )} />
                {activePayStatus === 'down' ? 'Indisponible' : activePayStatus === 'degraded' ? 'Dégradé' : 'Opérationnel'}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Statut du service de paiement Mobile Money
                </label>
                <select
                  value={activePayStatus || 'normal'}
                  onChange={(e) => setPayStatus(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none bg-gray-50/50 font-bold text-gray-800"
                >
                  <option value="normal">🟢 Opérationnel (Normal - Wave, Orange, MTN, Moov)</option>
                  <option value="degraded">🟡 Dégradé (Lenteurs signalées chez un opérateur)</option>
                  <option value="down">🔴 Indisponible (Paiements en ligne coupés temporairement)</option>
                </select>
              </div>

              {/* Force COD Switch */}
              <div
                className={cn(
                  'flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer',
                  activeDisableOnline ? 'bg-amber-50/70 border-amber-200' : 'bg-gray-50/70 border-gray-200/80 hover:bg-gray-100/60'
                )}
                onClick={() => setDisableOnline(!activeDisableOnline)}
              >
                <div className="flex flex-col pr-4">
                  <span className="text-xs font-bold text-gray-900">Désactiver temporairement les paiements en ligne</span>
                  <span className="text-[11px] text-gray-500">Force le paiement en espèces / COD uniquement au panier</span>
                </div>
                <div className={cn(
                  'w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0',
                  activeDisableOnline ? 'bg-amber-600' : 'bg-gray-300'
                )}>
                  <div className={cn(
                    'bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out',
                    activeDisableOnline ? 'translate-x-5' : 'translate-x-0'
                  )} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Bannière d'information paiement (affichée au checkout si renseignée)
                </label>
                <input
                  type="text"
                  value={activePayNotice || ''}
                  onChange={(e) => setPayNotice(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none bg-gray-50/50"
                  placeholder="Ex: Le réseau MTN MoMo subit des lenteurs nationales. Privilégiez Wave ou Orange."
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleSavePaymentConfig}
                  disabled={savingPay}
                  size="sm"
                  className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {savingPay ? 'Enregistrement...' : 'Enregistrer Paramètres Paiement'}
                </Button>
              </div>
            </div>
          </Card>

          {/* SECTION 3 : PARAMÈTRES ANTI-ABUS ANNULATIONS */}
          <Card className="p-6 rounded-3xl border border-gray-200/80 shadow-xs bg-white space-y-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-gray-900">Anti-Abus Annulations Répétées</h2>
                  <p className="text-xs text-gray-500">Verrouillage automatique en cas d'abus d'annulation.</p>
                </div>
              </div>

              <span className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold',
                activeCancelEnabled ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full', activeCancelEnabled ? 'bg-red-600' : 'bg-gray-400')} />
                {activeCancelEnabled ? 'Verrouillage Actif' : 'Désactivé'}
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Seuil maximum d'annulations consécutives
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={activeCancelMax}
                    onChange={(e) => setCancelMax(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none bg-gray-50/50 font-bold text-gray-900"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Recommandé : 3 annulations d'affilée.</p>
                </div>

                {/* Switch Anti-abus */}
                <div
                  className={cn(
                    'flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer',
                    activeCancelEnabled ? 'bg-red-50/70 border-red-200' : 'bg-gray-50/70 border-gray-200/80'
                  )}
                  onClick={() => setCancelEnabled(!activeCancelEnabled)}
                >
                  <div className="flex flex-col pr-2">
                    <span className="text-[11px] font-bold text-gray-900">Activer le verrouillage</span>
                    <span className="text-[10px] text-gray-500">Bloque après {activeCancelMax} annulations</span>
                  </div>
                  <div className={cn(
                    'w-9 h-5 flex items-center rounded-full p-0.5 transition-colors shrink-0',
                    activeCancelEnabled ? 'bg-red-600' : 'bg-gray-300'
                  )}>
                    <div className={cn(
                      'bg-white w-4 h-4 rounded-full shadow-md transform transition-transform',
                      activeCancelEnabled ? 'translate-x-4' : 'translate-x-0'
                    )} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Message d'explication affiché à l'acheteur bloqué
                </label>
                <textarea
                  rows={2}
                  value={activeCancelNotice}
                  onChange={(e) => setCancelNotice(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none bg-gray-50/50"
                  placeholder="Ex: Vous avez atteint la limite d'annulations consécutives..."
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleSaveCancellationConfig}
                  disabled={savingCancel}
                  size="sm"
                  className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {savingCancel ? 'Enregistrement...' : 'Enregistrer Paramètres Anti-Abus'}
                </Button>
              </div>
            </div>
          </Card>

          {/* SECTION 4 : ACTIONS DE SECOURS DE SYNCHRONISATION */}
          <Card className="p-6 rounded-3xl border border-slate-800 shadow-sm bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white">Actions de Secours & Resync Payouts</h2>
                <p className="text-xs text-slate-400">En cas d'échec de webhook, forcez la vérification des versements.</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
                Cette commande interpelle directement le serveur Railway pour re-vérifier chaque transaction de versement en attente et retenter l'envoi vers MoneyFusion sans bloquer les vendeurs.
              </p>

              <div className="flex justify-end">
                <Button
                  onClick={handleTriggerPayoutSync}
                  disabled={syncingPayouts}
                  size="sm"
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/10"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncingPayouts ? 'animate-spin' : ''}`} />
                  {syncingPayouts ? 'Synchronisation...' : 'Forcer Sync Payouts'}
                </Button>
              </div>
            </div>
          </Card>

          {/* SECTION 5 : GESTION DES BANNISSEMENTS IP (PLEINE LARGEUR) */}
          <div className="lg:col-span-2">
            <AdminIpBanSection />
          </div>
        </div>
      </div>
    </div>
  );
}
