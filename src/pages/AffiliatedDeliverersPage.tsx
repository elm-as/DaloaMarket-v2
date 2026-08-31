import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Truck,
  Plus,
  Info,
  Star,
  Sparkles,
  Clock,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { useSupabase } from '../hooks/useSupabase';
import { useSystemSettings } from '../hooks/useSystemSettings';
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
import { AffiliatedNonProUpgradeCard } from '../components/affiliated/AffiliatedNonProUpgradeCard';
import { AffiliatedDelivererCard } from '../components/affiliated/AffiliatedDelivererCard';
import { SellerDeliverySettingsCard } from '../components/affiliated/SellerDeliverySettingsCard';
import { InviteDelivererCard } from '../components/affiliated/InviteDelivererCard';

export default function AffiliatedDeliverersPage() {
  usePageTitle('Mes livreurs affiliés');
  useSEO('Mes livreurs affiliés', {
    description: 'Gérez vos livreurs de confiance et vos paramètres de livraison sur DaloaMarket.',
  });

  const navigate = useNavigate();
  const { user, userProfile, loading: authLoading } = useSupabase();
  const { phaseConfig } = useSystemSettings();

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

  const isAllowed = isPro || phaseConfig.allow_affiliated_deliverers_for_all;

  useEffect(() => {
    if (!user || !isAllowed) return;

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
  }, [user, isAllowed]);

  if (authLoading || (isAllowed && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/70">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAllowed) {
    return <AffiliatedNonProUpgradeCard />;
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

  // Remove driver or cancel invitation
  const handleRemoveDeliverer = async (affiliation: AffiliatedDeliverer) => {
    const isPending = affiliation.status === 'pending';
    const driverName = affiliation.delivery_person?.name || 'ce livreur';
    const confirmMessage = isPending
      ? `Voulez-vous annuler la demande d'affiliation envoyée à ${driverName} ?`
      : `Voulez-vous vraiment retirer l'affiliation de ${driverName} ?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setRemovingId(affiliation.id);
    const res = await affiliatedDeliverersService.removeAffiliation(affiliation.id);
    setRemovingId(null);

    if (res.success) {
      toast.success(isPending ? 'Demande annulée avec succès' : 'Affiliation retirée avec succès');
      setDeliverers((prev) => prev.filter((d) => d.id !== affiliation.id));
    } else {
      toast.error(res.message || 'Erreur lors de l\'annulation');
    }
  };

  const activeDeliverers = deliverers.filter((d) => d.status === 'active');
  const pendingDeliverers = deliverers.filter((d) => d.status === 'pending');

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
            {isPro ? (
              <><Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" /> Vendeur Pro</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5 fill-emerald-300 text-emerald-300" /> Phase de Lancement</>
            )}
          </span>
        </div>
      </header>

      <div className="relative z-10 -mt-7 max-w-4xl mx-auto px-4 space-y-5">
        {/* ── CARD 1: MODES DE LIVRAISON & OPTIONS COD ── */}
        <SellerDeliverySettingsCard
          settings={settings}
          savingSettings={savingSettings}
          onToggleSetting={handleToggleSetting}
        />

        {/* ── CARD 2: INVITER UN NOUVEAU LIVREUR ── */}
        <InviteDelivererCard
          invitePhone={invitePhone}
          setInvitePhone={setInvitePhone}
          inviting={inviting}
          onInvite={handleInviteDriver}
        />

        {/* ── CARD 3: DEMANDES EN ATTENTE ── */}
        {pendingDeliverers.length > 0 && (
          <div className="bg-white rounded-3xl border border-amber-200/80 shadow-xl shadow-amber-500/5 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-amber-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900">
                    Demandes en attente ({pendingDeliverers.length})
                  </h2>
                  <p className="text-xs text-amber-700 font-medium">En attente d'acceptation par le livreur sur DaloaDelivery</p>
                </div>
              </div>
              <span className="text-xs font-black text-amber-800 bg-amber-100/70 px-2.5 py-1 rounded-full border border-amber-200">
                Annulable
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <AnimatePresence>
                {pendingDeliverers.map((item) => (
                  <AffiliatedDelivererCard
                    key={item.id}
                    item={item}
                    removingId={removingId}
                    onRemove={handleRemoveDeliverer}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── CARD 4: LISTE DES LIVREURS ACTIFS ── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-gray-100/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900">
                  Mes Livreurs Partenaires
                </h2>
                <p className="text-xs text-gray-400 font-medium">Flotte confirmée et active pour votre boutique</p>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              {activeDeliverers.length} {activeDeliverers.length > 1 ? 'livreurs' : 'livreur'}
            </span>
          </div>

          {activeDeliverers.length === 0 && pendingDeliverers.length === 0 ? (
            <div className="text-center py-10 px-4 border border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-400 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-black text-gray-800">Aucun livreur affilié pour le moment</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto font-medium leading-relaxed">
                Invitez vos livreurs de confiance via leur numéro de téléphone ci-dessus pour leur confier vos commandes privées.
              </p>
            </div>
          ) : activeDeliverers.length === 0 ? (
            <div className="text-center py-6 px-4 border border-dashed border-gray-200 rounded-2xl bg-gray-50/30">
              <p className="text-xs text-gray-500 font-medium">
                Vos invitations sont en cours d'acceptation par vos livreurs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              <AnimatePresence>
                {activeDeliverers.map((item) => (
                  <AffiliatedDelivererCard
                    key={item.id}
                    item={item}
                    removingId={removingId}
                    onRemove={handleRemoveDeliverer}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
