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
  AlertCircle,
  Info,
  Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSEO } from '../hooks/useSEO';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { SectionHeader } from '../components/ui/SectionHeader';
import { cn, validateIvorianPhone } from '../lib/utils';
import {
  affiliatedDeliverersService,
} from '../services/affiliatedDeliverersService';
import type {
  AffiliatedDeliverer,
  SellerDeliverySettings,
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
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Si l'utilisateur n'est pas un Vendeur Pro, afficher la carte d'incitation Pro
  if (!isPro) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Retour</span>
        </button>

        <Card elevation={2} padding="lg" className="rounded-3xl text-center p-8 bg-gradient-to-b from-amber-500/10 via-background to-background border border-amber-500/20">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/20">
            <Users size={40} className="text-white" />
          </div>

          <h1 className="text-2xl font-bold text-[var(--color-on-surface)] mb-3">
            Espace Livreurs Affiliés (Vendeurs Pro)
          </h1>

          <p className="text-sm text-[var(--color-on-surface-variant)] max-w-md mx-auto mb-6 leading-relaxed">
            Travaillez avec vos propres livreurs de confiance tout en profitant des outils de gestion DaloaDelivery. Activez également le paiement à la livraison (COD) pour vos clients.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-lg mx-auto mb-8">
            <div className="p-4 rounded-2xl bg-surface border border-outline flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-[var(--color-on-surface)]">Livreurs de confiance</h4>
                <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-0.5">Invitez vos propres livreurs et confiez-leur vos courses en priorité.</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-surface border border-outline flex items-start gap-3">
              <Truck className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-[var(--color-on-surface)]">Paiement à la livraison</h4>
                <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-0.5">Proposez le paiement Cash on Delivery réservé à vos livreurs affiliés.</p>
              </div>
            </div>
          </div>

          <Button
            color="primary"
            size="lg"
            onClick={() => navigate('/devenir-pro')}
            className="shadow-lg shadow-amber-500/20"
          >
            Devenir Vendeur Pro
          </Button>
        </Card>
      </div>
    );
  }

  // Mettre à jour les toggles de livraison
  const handleToggleSetting = async (key: 'home_delivery_enabled' | 'cash_on_delivery_enabled') => {
    const newSettings = {
      ...settings,
      [key]: !settings[key],
    };

    // Si on désactive la livraison à domicile, désactiver aussi le COD
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
      toast.success(res.message || 'Paramètres mis à jour');
    } else {
      toast.error(res.message || 'Erreur lors de la mise à jour');
      // revert local state
      setSettings(settings);
    }
  };

  // Inviter un livreur
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
      toast.success(res.message || 'Invitation envoyée !');
      setInvitePhone('');
      // Recharger la liste
      const list = await affiliatedDeliverersService.getAffiliatedDeliverers();
      setDeliverers(list);
    } else {
      toast.error(res.message || 'Erreur lors de l\'invitation');
    }
  };

  // Retirer un livreur
  const handleRemoveDeliverer = async (affiliation: AffiliatedDeliverer) => {
    if (!window.confirm(`Voulez-vous vraiment retirer l'affiliation de ${affiliation.delivery_person?.name || 'ce livreur'} ?`)) {
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
    <div className="max-w-3xl mx-auto px-4 pt-16 md:pt-20 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-on-surface)]">
            Mes livreurs affiliés & Logistique
          </h1>
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            Gérez vos livreurs personnels et vos règles d'expédition
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Card 1: Paramètres de livraison du vendeur */}
        <Card padding="md" className="rounded-2xl shadow-elevation-1">
          <SectionHeader title="Paramètres de livraison de ma boutique" />

          <div className="mt-4 space-y-4">
            {/* Toggle 1: Livraison à domicile */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-outline shadow-sm">
              <div className="pr-4">
                <p className="text-sm font-semibold text-[var(--color-on-surface)]">
                  Livraison à domicile
                </p>
                <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                  Proposer l'expédition à domicile pour vos produits (si désactivé, seul le retrait en boutique est possible).
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={settings.home_delivery_enabled}
                  onChange={() => handleToggleSetting('home_delivery_enabled')}
                  disabled={savingSettings}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Toggle 2: Paiement à la livraison (COD) */}
            <div className={cn(
              "flex items-center justify-between p-3.5 rounded-2xl border transition-all",
              !settings.home_delivery_enabled
                ? "opacity-60 bg-gray-50/80 border-gray-200 pointer-events-none"
                : "bg-surface border-outline shadow-sm"
            )}>
              <div className="pr-4">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <p className="text-sm font-semibold text-[var(--color-on-surface)]">
                    Paiement à la livraison (Cash on Delivery)
                  </p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Livreurs Affiliés uniquement
                  </span>
                </div>
                <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed">
                  Autoriser les clients à payer en espèces à la livraison. Ces commandes privées sont diffusées uniquement à vos livreurs affiliés.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={settings.cash_on_delivery_enabled}
                  onChange={() => handleToggleSetting('cash_on_delivery_enabled')}
                  disabled={savingSettings || !settings.home_delivery_enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Helper Info Box */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5 leading-relaxed">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Règles de diffusion des commandes :</strong>
                <ul className="list-disc list-inside mt-1 space-y-1 text-blue-800">
                  <li><strong>Paiement en ligne :</strong> Commande publique accessible à tous les livreurs DaloaDelivery (y compris vos affiliés).</li>
                  <li><strong>Paiement à la livraison (COD) :</strong> Commande privée diffusée EXCLUSIVEMENT à vos livreurs affiliés.</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Card 2: Inviter un livreur */}
        <Card padding="md" className="rounded-2xl shadow-elevation-1">
          <SectionHeader title="Inviter un livreur affilié" />

          <p className="text-xs text-[var(--color-on-surface-variant)] mt-1 mb-4">
            Entrez le numéro de téléphone de votre livreur (enregistré sur l'application DaloaDelivery). Il recevra une demande d'affiliation dans son application.
          </p>

          <form onSubmit={handleInviteDriver} className="flex flex-col sm:flex-row gap-3">
            <input
              type="tel"
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              placeholder="Ex: 0708091011"
              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface)] text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
            <Button
              type="submit"
              loading={inviting}
              disabled={inviting}
              icon={<Plus size={18} />}
              className="whitespace-nowrap"
            >
              Envoyer l'invitation
            </Button>
          </form>
        </Card>

        {/* Card 3: Liste des livreurs affiliés */}
        <Card padding="md" className="rounded-2xl shadow-elevation-1">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader title={`Mes livreurs affiliés (${deliverers.length})`} />
          </div>

          {deliverers.length === 0 ? (
            <div className="text-center py-10 px-4 border border-dashed border-gray-200 rounded-2xl">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">Aucun livreur affilié pour le moment</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Invitez votre livreur habituel en saisissant son numéro de téléphone ci-dessus.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
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
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 rounded-2xl border border-outline bg-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {driver.photo_url ? (
                          <img
                            src={driver.photo_url}
                            alt={driver.name}
                            className="w-12 h-12 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-lg">
                            {driver.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {/* Bulle statut disponible */}
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white",
                            isAvailable ? "bg-green-500" : "bg-gray-400"
                          )}
                          title={isAvailable ? "Disponible" : "Indisponible"}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-[var(--color-on-surface)]">
                            {driver.name}
                          </h4>
                          {isPending ? (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <Clock size={10} /> En attente
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-100 text-green-800 border border-green-200 flex items-center gap-1">
                              <CheckCircle2 size={10} /> Affilié
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                          {driver.phone}
                        </p>

                        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1 text-amber-600 font-medium">
                            <Star size={12} className="fill-amber-400 text-amber-400" />
                            {driver.rating ? driver.rating.toFixed(1) : '5.0'}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{driver.vehicle_type || 'Moto'}</span>
                          <span>•</span>
                          <span className={isAvailable ? "text-green-600 font-medium" : "text-gray-400"}>
                            {isAvailable ? "Disponible" : "Hors ligne"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                      {/* Bouton Appel */}
                      <a
                        href={`tel:${driver.phone}`}
                        className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center gap-1.5 text-xs font-medium px-3"
                        title="Appeler le livreur"
                      >
                        <Phone size={14} className="text-blue-600" />
                        <span className="hidden sm:inline">Appeler</span>
                      </a>

                      {/* Bouton WhatsApp */}
                      <a
                        href={`https://wa.me/225${driver.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 transition-colors flex items-center gap-1.5 text-xs font-medium px-3"
                        title="Envoyer un message WhatsApp"
                      >
                        <MessageCircle size={14} className="text-green-600" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>

                      {/* Bouton Supprimer */}
                      <button
                        onClick={() => handleRemoveDeliverer(item)}
                        disabled={removingId === item.id}
                        className="p-2 rounded-xl hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                        title="Retirer l'affiliation"
                      >
                        {removingId === item.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
