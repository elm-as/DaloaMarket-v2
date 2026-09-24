import React, { useEffect, useState, useCallback } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn, formatShopShareText, shareWithImage } from '../lib/utils';
import { Avatar } from '../components/profile/Avatar';
import { ProBadge } from '../components/profile/ProBadge';
import { usePhase } from '../contexts/PhaseContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Star,
  Heart,
  Package,
  MapPin,
  Phone,
  Store,
  LogOut,
  BarChart3,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Share2,
  Edit3,
  Shield,
  Truck,
  ChevronRight,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

import { ProfileListingsTab } from '../components/profile/ProfileListingsTab';
import { ProfileReviewsTab } from '../components/profile/ProfileReviewsTab';
import { ProfileFavoritesTab } from '../components/profile/ProfileFavoritesTab';
import { ProfileShopTab } from '../components/profile/ProfileShopTab';
import { FeedbackForm } from '../components/profile/FeedbackForm';
import { Modal } from '../components/ui/Modal';

type TabId = 'listings' | 'reviews' | 'favorites' | 'shop';

const getTabFromParam = (param: string | null): TabId => {
  if (!param) return 'listings';
  const clean = param.toLowerCase();
  if (clean === 'shop' || clean === 'boutique' || clean === 'vitrine') return 'shop';
  if (clean === 'reviews' || clean === 'avis') return 'reviews';
  if (clean === 'favorites' || clean === 'favoris') return 'favorites';
  if (clean === 'listings' || clean === 'annonces' || clean === 'articles') return 'listings';
  return 'listings';
};

const ProfilePage: React.FC = () => {
  usePageTitle('Mon profil');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, userProfile, isAdmin, signOut } = useSupabase();
  const { showMonetisation } = usePhase();

  const [activeTab, setActiveTab] = useState<TabId>(() => getTabFromParam(searchParams.get('tab')));
  const [profileStats, setProfileStats] = useState({ activeCount: 0, soldCount: 0, reviewCount: 0 });
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // Synchronise l'onglet si l'URL searchParam change (ex: redirection, notif push, retour arrière)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(getTabFromParam(tabParam));
    }
  }, [searchParams]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const currentUserId = user?.id;
  const isPro = userProfile?.pro_until ? new Date(userProfile.pro_until) > new Date() : false;

  const fetchStats = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const [activeRes, soldRes, reviewRes] = await Promise.all([
        supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUserId)
          .neq('status', 'deleted')
          .neq('status', 'sold'),
        supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUserId)
          .eq('status', 'sold'),
        supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('reviewed_id', currentUserId),
      ]);
      setProfileStats({
        activeCount: activeRes.count || 0,
        soldCount: soldRes.count || 0,
        reviewCount: reviewRes.count || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleShareShop = async () => {
    if (!currentUserId) return;
    const { title, text } = formatShopShareText({
      id: currentUserId,
      shop_name: (userProfile as any)?.shop_name,
      full_name: userProfile?.full_name,
      shop_slug: (userProfile as any)?.shop_slug || null,
      district: (userProfile as any)?.district || null,
    });
    const imageUrl =
      (userProfile as any)?.shop_logo_url ||
      (userProfile as any)?.shop_banner_url ||
      userProfile?.avatar_url ||
      null;
    const res = await shareWithImage(title, text, imageUrl);
    if (res.copied) {
      toast.success('Lien copié !', { duration: 4000 });
    }
                };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const tabs: { id: TabId; label: string; count?: number; icon: React.ReactNode }[] = [
    { id: 'listings', label: 'Annonces', count: profileStats.activeCount, icon: <Package className="w-4 h-4" /> },
    { id: 'reviews', label: 'Avis', count: profileStats.reviewCount, icon: <Star className="w-4 h-4" /> },
    { id: 'favorites', label: 'Favoris', icon: <Heart className="w-4 h-4" /> },
    { id: 'shop', label: 'Boutique', icon: <Store className="w-4 h-4" /> },
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={cn(
          'w-3.5 h-3.5',
          i < Math.round(rating)
            ? 'text-amber-400 fill-amber-400'
            : 'text-gray-200'
        )}
      />
    ));
  };

  const hasShopLocation = (userProfile as any)?.shop_latitude != null && (userProfile as any)?.shop_longitude != null;
  const showShopLocationWarning = profileStats.activeCount > 0 && !hasShopLocation;

  const hasPayoutSetup = (userProfile as any)?.payout_network != null && (userProfile as any)?.payout_number != null;
  const showPayoutWarning = profileStats.activeCount > 0 && !hasPayoutSetup;

  // Raccourcis toujours visibles sous le bandeau : ils étaient en bas de page,
  // sous toutes les annonces, et il fallait défiler longtemps pour les atteindre.
  const shortcuts: { label: string; icon: React.ReactNode; onClick: () => void }[] = [
    { label: 'Commandes', icon: <Package className="h-5 w-5" />, onClick: () => navigate('/mes-commandes') },
    { label: 'Livreurs', icon: <Truck className="h-5 w-5" />, onClick: () => navigate('/mes-livreurs') },
    { label: 'Stats', icon: <BarChart3 className="h-5 w-5" />, onClick: () => navigate('/mes-statistiques') },
    ...(showMonetisation
      ? [{ label: 'Paiements', icon: <CreditCard className="h-5 w-5" />, onClick: () => navigate('/mes-paiements') }]
      : []),
    { label: 'Partager', icon: <Share2 className="h-5 w-5" />, onClick: handleShareShop },
  ];

  const stats: { label: string; value: number; tab: TabId }[] = [
    { label: 'Actives', value: profileStats.activeCount, tab: 'listings' },
    { label: 'Vendues', value: profileStats.soldCount, tab: 'listings' },
    { label: 'Avis', value: profileStats.reviewCount, tab: 'reviews' },
  ];

  return (
    <div className="w-full max-w-2xl lg:max-w-5xl mx-auto pb-28 lg:px-6 lg:pb-12 bg-gray-50/70 min-h-screen">
      {/* ── Bandeau d'identité, aux couleurs DaloaMarket ── */}
      <div className="relative overflow-hidden rounded-b-[32px] bg-gradient-to-br from-orange-500 via-[var(--color-primary)] to-amber-600 px-4 pt-5 pb-16 lg:mt-4 lg:rounded-3xl">
        <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-black/10 blur-2xl" />

        <div className="relative flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Mon profil</h1>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-xs font-semibold text-white backdrop-blur-md hover:bg-white/25"
              >
                <Shield className="h-3.5 w-3.5" /> Admin
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-xs font-semibold text-white backdrop-blur-md hover:bg-white/25"
            >
              <Edit3 className="h-3.5 w-3.5" /> Paramètres
            </button>
          </div>
        </div>

        <div className="relative mt-5 flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar
              src={userProfile?.avatar_url}
              name={userProfile?.full_name}
              size="xl"
              className="ring-4 ring-white/30"
            />
            {isPro && (
              <div className="absolute -bottom-1 -right-1">
                <ProBadge iconOnly size="sm" ring />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-white">{userProfile?.full_name || 'Utilisateur'}</h2>
            {userProfile?.rating != null && (
              <div className="mt-1 flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">{renderStars(userProfile.rating)}</div>
                <span className="text-xs font-semibold text-white">{userProfile.rating.toFixed(1)}</span>
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-white">
              {userProfile?.phone && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-md">
                  <Phone className="h-3 w-3" /> {userProfile.phone}
                </span>
              )}
              {userProfile?.district && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-md">
                  <MapPin className="h-3 w-3" /> {userProfile.district}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2">
          {stats.map((st) => (
            <button
              key={st.label}
              type="button"
              onClick={() => handleTabChange(st.tab)}
              className="rounded-2xl bg-white/15 px-2 py-2.5 text-center backdrop-blur-md transition-colors hover:bg-white/25"
            >
              <p className="text-lg font-bold leading-none text-white tabular-nums">{st.value}</p>
              <p className="mt-1 text-[11px] font-medium text-orange-50">{st.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 -mt-10 px-4">
        {/* ── Raccourcis : toujours à portée de pouce ── */}
        {/* Colonnes égales : tout est visible, sans défilement horizontal */}
        <div
          className="grid gap-1 rounded-3xl bg-white p-2 shadow-lg shadow-orange-900/5 ring-1 ring-gray-100"
          style={{ gridTemplateColumns: `repeat(${shortcuts.length}, minmax(0, 1fr))` }}
        >
          {shortcuts.map((sc) => (
            <button
              key={sc.label}
              type="button"
              onClick={sc.onClick}
              className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 text-gray-700 transition-colors hover:bg-orange-50 active:scale-95"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-[var(--color-primary)]">
                {sc.icon}
              </span>
              <span className="w-full truncate text-center text-[11px] font-semibold">{sc.label}</span>
            </button>
          ))}
        </div>

        {/* Une seule alerte à la fois, la plus urgente : sans compte de retrait,
            le vendeur ne peut pas être payé. */}
        {(showPayoutWarning || showShopLocationWarning) && (
          <button
            type="button"
            onClick={() => navigate(showPayoutWarning ? '/settings/payout' : '/settings?tab=boutique')}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="min-w-0 flex-1 text-sm text-amber-900">
              {showPayoutWarning
                ? 'Ajoutez votre compte Mobile Money pour recevoir vos ventes.'
                : 'Placez votre boutique sur la carte pour calculer les frais de livraison.'}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-amber-700" />
          </button>
        )}
      </div>

      {/* ── Onglets : 4 colonnes égales, tout visible sans défiler ──
          Pas d'icône (c'est elles qui prenaient la largeur) ; le compteur est
          une bulle posée sur l'angle, qui ne pousse pas le texte. */}
      <div className="sticky top-14 z-20 mt-5 bg-gray-50/95 px-4 py-2.5 backdrop-blur-md lg:top-16">
        <div className="grid grid-cols-4 gap-1.5">
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                aria-pressed={isSelected}
                className={cn(
                  'relative flex h-10 items-center justify-center rounded-xl text-[13px] font-semibold transition-colors',
                  isSelected
                    ? 'bg-[var(--color-primary)] text-white shadow-md shadow-orange-500/20'
                    : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:text-gray-900'
                )}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={cn(
                      'absolute -top-1.5 -right-1 min-w-[18px] rounded-full px-1 text-center text-[10px] font-bold leading-[18px] ring-2 ring-gray-50',
                      isSelected ? 'bg-gray-900 text-white' : 'bg-[var(--color-primary)] text-white'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mt-2"
          >
            {activeTab === 'listings' && (
              <ProfileListingsTab userId={currentUserId!} activeCount={profileStats.activeCount} />
            )}
            {activeTab === 'reviews' && <ProfileReviewsTab userId={currentUserId!} />}
            {activeTab === 'favorites' && <ProfileFavoritesTab userId={currentUserId!} />}
            {activeTab === 'shop' && <ProfileShopTab userProfile={userProfile} />}
          </motion.div>
        </AnimatePresence>

        {/* Actions rares : elles peuvent rester en bas de page */}
        <div className="mt-8 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setIsFeedbackModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-medium text-gray-700 ring-1 ring-gray-100 hover:bg-gray-50"
          >
            <MessageSquare className="h-4 w-4 text-[var(--color-primary)]" /> Donner mon avis
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-medium text-red-600 ring-1 ring-gray-100 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" /> Se déconnecter
          </button>
        </div>
      </div>

      <Modal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        title="Votre avis compte !"
        size="lg"
      >
        <FeedbackForm
          userId={currentUserId!}
          onSuccess={() => setIsFeedbackModalOpen(false)}
          onCancel={() => setIsFeedbackModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default ProfilePage;

