import React, { useEffect, useState, useCallback } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn, formatShopShareText, shareWithImage } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/profile/Avatar';
import { ProBadge } from '../components/profile/ProBadge';
import { PHASE0_FREE_MODE } from '../lib/featureFlags';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

import { ProfileListingsTab } from '../components/profile/ProfileListingsTab';
import { ProfileReviewsTab } from '../components/profile/ProfileReviewsTab';
import { ProfileFavoritesTab } from '../components/profile/ProfileFavoritesTab';
import { ProfileShopTab } from '../components/profile/ProfileShopTab';

type TabId = 'listings' | 'reviews' | 'favorites' | 'shop';

const ProfilePage: React.FC = () => {
  usePageTitle('Mon profil');
  const navigate = useNavigate();
  const { user, userProfile, signOut } = useSupabase();

  const [activeTab, setActiveTab] = useState<TabId>('listings');
  const [profileStats, setProfileStats] = useState({ activeCount: 0, soldCount: 0, reviewCount: 0 });

  const currentUserId = user?.id;
  const isPro = userProfile?.pro_until ? new Date(userProfile.pro_until) > new Date() : false;

  const fetchStats = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const [activeRes, soldRes, reviewRes] = await Promise.all([
        supabase.from('listings').select('*', { count: 'exact', head: true })
          .eq('user_id', currentUserId)
          .neq('status', 'deleted')
          .neq('status', 'sold'),
        supabase.from('listings').select('*', { count: 'exact', head: true })
          .eq('user_id', currentUserId)
          .eq('status', 'sold'),
        supabase.from('reviews').select('*', { count: 'exact', head: true })
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'listings', label: 'Mes annonces', icon: <Package className="w-4 h-4" /> },
    { id: 'reviews', label: 'Avis', icon: <Star className="w-4 h-4" /> },
    { id: 'favorites', label: 'Favoris', icon: <Heart className="w-4 h-4" /> },
    { id: 'shop', label: 'Boutique', icon: <Store className="w-4 h-4" /> },
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={cn(
          'w-4 h-4',
          i < Math.round(rating)
            ? 'text-amber-400 fill-amber-400'
            : 'text-gray-300'
        )}
      />
    ));
  };

  const hasShopLocation = (userProfile as any)?.shop_latitude != null && (userProfile as any)?.shop_longitude != null;
  const showShopLocationWarning = profileStats.activeCount > 0 && !hasShopLocation;

  const hasPayoutSetup = (userProfile as any)?.payout_network != null && (userProfile as any)?.payout_number != null;
  const showPayoutWarning = profileStats.activeCount > 0 && !hasPayoutSetup;

  return (
    <div className="w-full max-w-2xl lg:max-w-none mx-auto pb-24 lg:px-6 lg:pb-8">
      {showShopLocationWarning && (
        <div className="mx-4 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 items-start shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-amber-800">Emplacement boutique requis</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              Vous avez des annonces actives, mais la localisation GPS de votre boutique n'est pas configurée. Les livreurs en ont besoin pour récupérer vos colis et calculer les frais de livraison.
            </p>
            <button
              onClick={() => navigate('/settings?tab=boutique')}
              className="text-xs font-bold text-amber-800 underline mt-2 hover:text-amber-900 block text-left"
            >
              Définir l'emplacement maintenant &rarr;
            </button>
          </div>
        </div>
      )}

      {showPayoutWarning && (
        <div className="mx-4 mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 items-start shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-red-800">Coordonnées de paiement requises</h4>
            <p className="text-xs text-red-700 mt-0.5">
              Vous avez des annonces actives, mais vos coordonnées de retrait (Wave, MTN, Orange ou Moov) ne sont pas configurées. Vous devez les définir pour recevoir vos gains de vente.
            </p>
            <button
              onClick={() => navigate('/settings/payout')}
              className="text-xs font-bold text-red-800 underline mt-2 hover:text-red-900 block text-left"
            >
              Configurer vos coordonnées de retrait &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Profile Header Card */}
      <Card elevation={3} padding="lg" className="relative overflow-hidden rounded-2xl mx-4">
        <div
          className="absolute inset-0 opacity-10"
          style={{ background: 'var(--gradient-primary)' }}
        />

        <div className="relative flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Avatar
              src={userProfile?.avatar_url}
              name={userProfile?.full_name}
              size="xl"
              className="ring-4 ring-white shadow-lg"
            />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="mt-4 text-xl font-bold text-[var(--color-on-surface)]"
          >
            {userProfile?.full_name || 'Utilisateur'}
            {(userProfile?.phone && userProfile?.avatar_url) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-[11px] font-medium rounded-full mt-1">
                <CheckCircle className="w-3 h-3" />
              </span>
            )}
          </motion.h2>

          {isPro && <ProBadge size="md" className="mt-1" />}

          {userProfile?.rating != null && (
            <div className="flex items-center gap-1 mt-2">
              {renderStars(userProfile.rating)}
              <span className="text-sm text-[var(--color-on-surface-variant)] ml-1">
                {userProfile.rating.toFixed(1)}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-sm text-[var(--color-on-surface-variant)]">
            {userProfile?.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                {userProfile.phone}
              </span>
            )}
            {userProfile?.district && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {userProfile.district}
              </span>
            )}
          </div>

          <p className="text-xs text-[var(--color-on-surface-variant)] mt-2">
            {profileStats.activeCount} actives &middot; {profileStats.soldCount} vendues &middot; {profileStats.reviewCount} avis
          </p>

          <div className="lg:hidden flex items-center gap-2 mt-3">
            <Button
              variant="outlined"
              color="primary"
              size="sm"
              className="active:scale-[0.97]"
              icon={<BarChart3 className="w-3.5 h-3.5" />}
              onClick={() => navigate('/mes-statistiques')}
            >
              Statistiques
            </Button>
            {!PHASE0_FREE_MODE && (
            <Button
              variant="outlined"
              color="secondary"
              size="sm"
              className="active:scale-[0.97]"
              icon={<CreditCard className="w-3.5 h-3.5" />}
              onClick={() => navigate('/mes-paiements')}
            >
              Paiements
            </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
            <Button
              variant="outlined"
              color="primary"
              size="sm"
              className="active:scale-[0.97]"
              onClick={() => navigate('/settings')}
            >
              Modifier le profil
            </Button>

            {/* Bouton Partager réservé UNIQUEMENT aux vendeurs Pro */}
            {isPro && (
              <Button
                variant="filled"
                color="primary"
                size="sm"
                className="active:scale-[0.97]"
                icon={<Share2 className="w-4 h-4" />}
                onClick={async () => {
                  if (!currentUserId) return;
                  const { title, text } = formatShopShareText({
                    id: currentUserId,
                    shop_name: (userProfile as any)?.shop_name,
                    full_name: userProfile?.full_name,
                  });
                  const imageUrl = (userProfile as any)?.shop_logo_url || (userProfile as any)?.shop_banner_url || userProfile?.avatar_url || null;
                  const res = await shareWithImage(title, text, imageUrl);
                  if (res.copied) {
                    toast.success('Lien et texte de votre boutique copiés ! (Faites Ctrl+V dans la légende si besoin)', { duration: 5000 });
                  }
                }}
              >
                Partager ma boutique
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="lg:flex lg:gap-6 lg:mt-6">
        <div className="hidden lg:flex lg:flex-col lg:w-56 lg:flex-shrink-0 lg:gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-[var(--color-primary-50)] text-[var(--color-primary)]'
                  : 'text-[var(--color-on-surface-variant)] hover:bg-gray-50'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          <button onClick={() => navigate('/mes-commandes')} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--color-on-surface-variant)] hover:bg-gray-50 transition-colors">
            <Package className="w-4 h-4" />
            Mes commandes
          </button>
          <div className="my-3 border-t border-gray-100" />
          <button onClick={() => navigate('/mes-statistiques')} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--color-on-surface-variant)] hover:bg-gray-50 transition-colors">
            <BarChart3 className="w-4 h-4" />
            Statistiques
          </button>
          {!PHASE0_FREE_MODE && (
          <button onClick={() => navigate('/mes-paiements')} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--color-on-surface-variant)] hover:bg-gray-50 transition-colors">
            <CreditCard className="w-4 h-4" />
            Paiements
          </button>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="lg:hidden mt-4">
            <div className="flex border-b border-gray-200 px-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium relative transition-colors active:scale-[0.97]',
                    activeTab === tab.id
                      ? 'text-[var(--color-primary)]'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="profile-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)] rounded-full"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-4 px-4 lg:px-0"
            >
              {activeTab === 'listings' && <ProfileListingsTab userId={currentUserId!} activeCount={profileStats.activeCount} />}
              {activeTab === 'reviews' && <ProfileReviewsTab userId={currentUserId!} />}
              {activeTab === 'favorites' && <ProfileFavoritesTab userId={currentUserId!} />}
              {activeTab === 'shop' && <ProfileShopTab userProfile={userProfile} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="mt-8 px-4 lg:px-0 space-y-3">
        <Button
          variant="text"
          color="error"
          fullWidth
          icon={<LogOut className="w-4 h-4" />}
          onClick={handleSignOut}
        >
          Se deconnecter
        </Button>
      </div>
    </div>
  );
};

export default ProfilePage;
