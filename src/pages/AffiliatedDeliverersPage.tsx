import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Truck,
  Phone,
  MessageCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Info,
  Star,
  Banknote,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSEO } from '../hooks/useSEO';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { cn, validateIvorianPhone } from '../lib/utils';
import {
  affiliatedDeliverersService,
  type AffiliatedDeliverer,
  type SellerDeliverySettings,
} from '../services/affiliatedDeliverersService';

export default function AffiliatedDeliverersPage() {
  usePageTitle('Mes livreurs affiliés');
  useSEO('Mes livreurs affiliés', {
    description: 'Gérez vos livreurs de confiance et vos paramètres de livraison sur DaloaMarket.',
  });

  const navigate = useNavigate();
  const { user, userProfile, loading: authLoading } = useSupabase();

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');

  const [settings, setSettings] = useState<SellerDeliverySettings>({
    seller_id: user?.id || '',
    home_delivery_enabled: true,
    cash_on_delivery_enabled: false,
  });

  const [deliverers, setDeliverers] = useState<AffiliatedDeliverer[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const isPro = userProfile?.pro_until
    ? new Date(userProfile.pro_until) > new Date()
    : false;

  useEffect(() => {
    if (!user || !isPro) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [settData, delivData] = await Promise.all([
          affiliatedDeliverersService.getSellerDeliverySettings(user.id),
          affiliatedDeliverersService.getAffiliatedDeliverers(),
        ]);
        setSettings(settData);
        setDeliverers(delivData);
      } catch (err) {
        console.error('Error loading deliverers page data:', err);
        toast.error('Erreur de chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, isPro]);

  if (authLoading || (isPro && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/70">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Non-Pro User: Upgrade CTA
  if (!isPro) {
    return (
      <div className="min-h-screen bg-gray-50/70 pb-20">
        {/* Header */}
        <header className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-amber-600 px-5 pt-6 pb-14 rounded-b-[36px] shadow-lg shadow-orange-500/15">
          <div className="absolute -top-12 -right-10 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
          <div className="relative max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-10 h-10 inline-flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white active:scale-95 transition-all shadow-xs"
                aria-label="Retour"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-100">
                  Espace Vendeur · Logistique
                </p>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Livreurs Affiliés
                </h1>
              </div>
            </div>
          </div>
        </header>

        <div className="relative z-10 -mt-7 max-w-xl mx-auto px-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-100 shadow-xl shadow-gray-200/50 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/25 text-white">
              <Sparkles className="w-8 h-8" />
            </div>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-black border border-amber-200 mb-3">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Fonctionnalité Réservée aux Vendeurs Pro
            </span>

            <h2 className="text-xl font-black text-gray-900 mb-2">
              Affiliez vos propres livreurs de confiance
            </h2>

            <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto mb-6 leading-relaxed">
              Passez au Pass Vendeur Pro pour confier vos colis en priorité à vos livreurs habituels et activer le paiement à la livraison (Cash on Delivery) à Daloa.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-6">
              <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-100 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-gray-900">Vos livreurs dédiés</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Courses attribuées en direct à votre flotte de livreurs.</p>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-start gap-3">
                <Banknote className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-gray-900">Paiement Cash (COD)</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Encaissez en liquide ou Mobile Money à la réception du colis.</p>
                </div>
              </div>
            </div>

            <Button
              color="primary"
              size="lg"
              onClick={() => navigate('/devenir-pro')}
              className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-black shadow-lg shadow-orange-500/25 active:scale-[0.98]"
            >
              Devenir Vendeur Pro ➔
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Toggle delivery settings
  const handleToggleSetting = async (key: 'home_delivery_enabled' | 'cash_on_delivery_enabled') => {
    const newSettings = {
      ...settings,
      [key]: !settings[key],
    };

    if (key === 'home_delivery_enabled' && !newSettings.home_delivery_enabled) {
      newSettings.cash_on_delivery_enabled = false;
    }

    setSettings(newSettings);
    setSavingSettings(true);

    const res = await affiliatedDeliverersService.updateSellerDeliverySettings(
      newSettings.home_delivery_enabled,
      newSettings.cash_on_delivery_enabled
    );

    setSavingSettings(false);

    if (res.success) {
      toast.success(res.message || 'Paramètres enregistrés');
    } else {
      toast.error(res.message || 'Erreur lors de la mise à jour');
      setSettings(settings);
    }
  };

  // Invite driver
  const handleInviteDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitePhone.trim()) {
      toast.error('Veuillez entrer un numéro de téléphone');
      return;
    }

    if (!validateIvorianPhone(invitePhone)) {
      toast.error('Format de numéro ivoirien invalide (ex: 0708091011)');
      return;
    }

    setInviting(true);
    const res = await affiliatedDeliverersService.inviteDelivererByPhone(invitePhone);
    setInviting(false);

    if (res.success) {
      toast.success(res.message || 'Invitation envoyée avec succès !');
      setInvitePhone('');
      const list = await affiliatedDeliverersService.getAffiliatedDeliverers();
      setDeliverers(list);
    } else {
      toast.error(res.message || 'Erreur lors de l\'invitation');
    }
  };

  // Remove driver
  const handleRemoveDeliverer = async (affiliation: AffiliatedDeliverer) => {
    const driverName = affiliation.delivery_person?.name || 'ce livreur';
    if (!window.confirm(`Voulez-vous vraiment retirer l'affiliation de ${driverName} ?`)) {
      return;
    }

    setRemovingId(affiliation.id);
    const res = await affiliatedDeliverersService.removeAffiliation(affiliation.id);
    setRemovingId(null);

    if (res.success) {
      toast.success('Affiliation retirée avec succès');
      setDeliverers((prev) => prev.filter((d) => d.id !== affiliation.id));
    } else {
      toast.error(res.message || 'Erreur de suppression');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/70 pb-28">
      {/* ── HERO BANNER ── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-amber-600 px-4 sm:px-6 pt-6 pb-14 rounded-b-[36px] shadow-lg shadow-orange-500/15">
        <div className="absolute -top-12 -right-10 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-14 -left-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-10 h-10 inline-flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white active:scale-95 transition-all shadow-xs"
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-100">
                Logistique & Expédition
              </p>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Mes Livreurs Affiliés
              </h1>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black border border-white/25 shadow-2xs">
            <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" /> Vendeur Pro
          </span>
        </div>
      </header>

      <div className="relative z-10 -mt-7 max-w-4xl mx-auto px-4 space-y-5">
        {/* ── CARD 1: MODES DE LIVRAISON & OPTIONS COD ── */}
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

              {/* Bouton Switch Interactif */}
              <button
                type="button"
                role="switch"
                aria-checked={settings.home_delivery_enabled}
                onClick={() => handleToggleSetting('home_delivery_enabled')}
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
                    👑 Exclusif Affiliés
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Les acheteurs peuvent payer en espèces ou Mobile Money lors de la réception de leur colis par vos livreurs affiliés.
                </p>
              </div>

              {/* Bouton Switch Interactif COD */}
              <button
                type="button"
                role="switch"
                aria-checked={settings.cash_on_delivery_enabled}
                onClick={() => handleToggleSetting('cash_on_delivery_enabled')}
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

        {/* ── CARD 2: INVITER UN NOUVEAU LIVREUR ── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-5 sm:p-6 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900">Inviter un Livreur</h2>
                <p className="text-xs text-gray-400 font-medium">Ajoutez un livreur pour lui confier vos courses en direct</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
              📱 DaloaDelivery
            </span>
          </div>

          <form onSubmit={handleInviteDriver} className="pt-1">
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="relative flex-1 flex items-center bg-gray-50/80 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-400 border border-gray-200 rounded-2xl transition-all overflow-hidden px-3.5 py-1">
                <span className="text-xs font-black text-gray-500 select-none pr-2 border-r border-gray-200">
                  🇨🇮 +225
                </span>
                <input
                  type="tel"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="07 08 09 10 11"
                  className="flex-1 bg-transparent px-2.5 py-2 text-sm font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none border-none"
                />
              </div>

              <Button
                type="submit"
                color="primary"
                size="md"
                loading={inviting}
                disabled={inviting}
                icon={<Plus size={16} />}
                className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-black shadow-md shadow-orange-500/25 active:scale-[0.98] whitespace-nowrap px-6 py-3"
              >
                Inviter
              </Button>
            </div>
            <p className="text-[11px] text-gray-400 mt-2 font-medium">
              💡 Le livreur recevra une invitation à valider directement dans son application DaloaDelivery.
            </p>
          </form>
        </div>

        {/* ── CARD 3: LISTE DES LIVREURS AFFILIÉS ── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-gray-100/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900">
                  Mes Livreurs Actifs
                </h2>
                <p className="text-xs text-gray-400 font-medium">Flotte affiliée à votre boutique</p>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              {deliverers.length} {deliverers.length > 1 ? 'livreurs' : 'livreur'}
            </span>
          </div>

          {deliverers.length === 0 ? (
            <div className="text-center py-10 px-4 border border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-400 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-black text-gray-800">Aucun livreur affilié pour le moment</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto font-medium leading-relaxed">
                Invitez vos livreurs de confiance via leur numéro de téléphone ci-dessus pour leur confier vos commandes privées.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              <AnimatePresence>
                {deliverers.map((item) => {
                  const driver = item.delivery_person;
                  if (!driver) return null;

                  const isAvailable = driver.is_available;
                  const isPending = item.status === 'pending';

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-3 sm:p-3.5 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:border-orange-200 transition-all shadow-2xs hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Left: Avatar + Driver Info */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative shrink-0">
                            {driver.photo_url ? (
                              <img
                                src={driver.photo_url}
                                alt={driver.name}
                                className="w-10 h-10 rounded-xl object-cover border border-gray-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                                {driver.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                                isAvailable ? "bg-emerald-500" : "bg-gray-400"
                              )}
                              title={isAvailable ? "En ligne" : "Hors ligne"}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-sm text-gray-900 truncate">
                                {driver.name}
                              </h4>
                              {isPending ? (
                                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 shrink-0">
                                  <Clock size={10} className="text-amber-600" /> En attente
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 shrink-0">
                                  <CheckCircle2 size={10} className="text-emerald-600" /> Affilié
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                              <span className="font-semibold text-gray-700">{driver.phone}</span>
                              <span className="text-gray-300">•</span>
                              <span className="text-amber-700 font-bold flex items-center gap-0.5 text-[11px]">
                                <Star size={10} className="fill-amber-400 text-amber-400" />
                                {driver.rating ? driver.rating.toFixed(1) : '5.0'}
                              </span>
                              <span className="text-gray-300">•</span>
                              <span className="capitalize text-[11px] text-gray-600">{driver.vehicle_type || 'Moto'}</span>
                              <span className="text-gray-300">•</span>
                              <span className={cn("text-[11px] font-bold", isAvailable ? "text-emerald-600" : "text-gray-400")}>
                                {isAvailable ? "En ligne" : "Hors ligne"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Compact Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={`tel:${driver.phone}`}
                            className="w-8.5 h-8.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 active:scale-95 transition-all flex items-center justify-center shadow-2xs"
                            title="Appeler"
                          >
                            <Phone size={14} className="text-blue-600" />
                          </a>

                          <a
                            href={`https://wa.me/225${driver.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8.5 h-8.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 active:scale-95 transition-all flex items-center justify-center shadow-2xs"
                            title="WhatsApp"
                          >
                            <MessageCircle size={14} className="text-emerald-600" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleRemoveDeliverer(item)}
                            disabled={removingId === item.id}
                            className="w-8.5 h-8.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-600 active:scale-90 transition-all flex items-center justify-center"
                            title="Retirer l'affiliation"
                          >
                            {removingId === item.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </div>

                      {isPending && (
                        <p className="text-[10.5px] text-amber-700 bg-amber-50/70 px-2.5 py-1 rounded-lg border border-amber-100/80 mt-2 font-medium">
                          ⏳ Invitation transmise · En attente de validation dans l'app DaloaDelivery
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
