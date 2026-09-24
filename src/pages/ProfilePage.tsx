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

  return (
    <div className="w-full max-w-2xl lg:max-w-5xl mx-auto pb-28 lg:px-6 lg:pb-12 bg-gray-50/70 min-h-screen">
      {/* En-tête sobre (l'ancien bandeau en dégradé portait aussi un 2e accès admin) */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold text-gray-900">Mon profil</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <Shield className="h-3.5 w-3.5" /> Admin
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Edit3 className="h-3.5 w-3.5" /> Paramètres
          </button>
        </div>
      </div>

      <div className="px-4">
        {/* Une seule alerte à la fois, la plus urgente : sans compte de retrait,
            le vendeur ne peut pas être payé. */}
        {(showPayoutWarning || showShopLocationWarning) && (
          <button
            type="button"
            onClick={() => navigate(showPayoutWarning ? '/settings/payout' : '/settings?tab=boutique')}
            className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left"
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

        {/* ── PROFILE MAIN CARD ── */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            {/* Avatar */}
            <div className="relative">
              <Avatar
                src={userProfile?.avatar_url}
                name={userProfile?.full_name}
                size="xl"
                className="ring-4 ring-orange-50 shadow-md"
              />
              {isPro && (
                <div className="absolute -bottom-1 -right-1">
                  <ProBadge iconOnly size="sm" ring />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl font-black text-gray-900">
                  {userProfile?.full_name || 'Utilisateur'}
                </h2>
              </div>

              {/* Rating */}
              {userProfile?.rating != null && (
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1.5">
                  <div className="flex items-center gap-0.5">
                    {renderStars(userProfile.rating)}
                  </div>
                  <span className="text-xs font-extrabold text-gray-700">
                    {userProfile.rating.toFixed(1)}
                  </span>
                </div>
              )}

              {/* Badges (Phone & District) */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2 text-xs text-gray-500 font-medium">
                {userProfile?.phone && (
                  <span className="inline-flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-xl">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {userProfile.phone}
                  </span>
                )}
                {userProfile?.district && (
                  <span className="inline-flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-xl">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                    {userProfile.district}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── 3-Tile Stats Strip ── */}
          <div className="grid grid-cols-3 gap-2 w-full mt-4 pt-4 border-t border-gray-100">
            <div className="rounded-2xl bg-gray-50/80 p-2.5 text-center">
              <p className="text-lg font-black text-gray-900 leading-none">{profileStats.activeCount}</p>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mt-1">Actives</p>
            </div>
            <div className="rounded-2xl bg-gray-50/80 p-2.5 text-center">
              <p className="text-lg font-black text-gray-900 leading-none">{profileStats.soldCount}</p>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mt-1">Vendues</p>
            </div>
            <div className="rounded-2xl bg-gray-50/80 p-2.5 text-center">
              <p className="text-lg font-black text-gray-900 leading-none">{profileStats.reviewCount}</p>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mt-1">Avis</p>
            </div>
          </div>

        </div>

        {/* ── TABS NAVIGATION (PREMIUM UNDERLINE SLIDER) ── */}
        <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center">
            {tabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'relative flex-1 flex items-center justify-center gap-1.5 py-3 px-1 text-xs transition-colors select-none active:scale-[0.98]',
                    isSelected
                      ? 'text-orange-600 font-black'
                      : 'text-gray-400 font-semibold hover:text-gray-700'
                  )}
                >
                  <span className={cn('transition-colors flex-shrink-0', isSelected ? 'text-orange-600' : 'text-gray-400')}>
                    {tab.icon}
                  </span>
                  <span className="truncate">{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={cn(
                        'text-[10px] min-w-[16px] h-4 px-1 rounded-full font-black flex items-center justify-center leading-none transition-colors flex-shrink-0',
                        isSelected
                          ? 'bg-orange-500 text-white shadow-2xs'
                          : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {tab.count}
                    </span>
                  )}

                  {/* Animated Active Indicator */}
                  {isSelected && (
                    <motion.div
                      layoutId="activeProfileTabIndicator"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="absolute bottom-0 left-3 right-3 h-[2.5px] bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TAB CONTENT ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mt-4"
          >
            {activeTab === 'listings' && (
              <ProfileListingsTab userId={currentUserId!} activeCount={profileStats.activeCount} />
            )}
            {activeTab === 'reviews' && <ProfileReviewsTab userId={currentUserId!} />}
            {activeTab === 'favorites' && <ProfileFavoritesTab userId={currentUserId!} />}
            {activeTab === 'shop' && <ProfileShopTab userProfile={userProfile} />}
          </motion.div>
        </AnimatePresence>

        {/* ── ACCOUNT SETTINGS & LOGOUT ACTIONS ── */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
          <button
            type="button"
            onClick={() => navigate('/mes-livreurs')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
          >
            <span className="flex items-center gap-3 text-sm text-gray-900">
              <Truck className="w-4 h-4 text-gray-500" />
              Mes livreurs
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/mes-statistiques')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
          >
            <span className="flex items-center gap-3 text-sm text-gray-900">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              Statistiques
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          {showMonetisation ? (
            <button
            type="button"
            onClick={() => navigate('/mes-paiements')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
          >
            <span className="flex items-center gap-3 text-sm text-gray-900">
              <CreditCard className="w-4 h-4 text-gray-500" />
              Paiements
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          ) : (
          <button
            type="button"
            onClick={handleShareShop}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
          >
            <span className="flex items-center gap-3 text-sm text-gray-900">
              <Share2 className="w-4 h-4 text-gray-500" />
              Partager ma boutique
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          )}
          <button
            type="button"
            onClick={() => setIsFeedbackModalOpen(true)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Donner mon avis sur l'application</p>
                <p className="text-[11px] text-gray-400">Aidez-nous à améliorer DaloaMarket</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-between p-4 hover:bg-red-50/50 active:bg-red-100 transition-colors text-left text-red-600"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-red-600">Se déconnecter</p>
                <p className="text-[11px] text-red-400">Fermer votre session actuelle</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-red-400" />
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

