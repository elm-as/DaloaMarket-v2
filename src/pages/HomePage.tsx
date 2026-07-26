import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Shield,
  MapPin,
  CreditCard,
  Lock,
  Shirt,
  Monitor,
  Home,
  Car,
  Dumbbell,
  BookOpen,
  UtensilsCrossed,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

import { useSupabase } from '../hooks/useSupabase';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useSEO } from '../hooks/useSEO';
import { formatPrice, interleaveBoosted, diversifySellers, CATEGORIES, cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { useCart } from '../context/CartContext';
import { ErrorState } from '../components/ui/ErrorState';
import { SectionHeader } from '../components/ui/SectionHeader';
import ListingCard from '../components/listings/ListingCard';
import ListingCardSkeleton from '../components/listings/ListingCardSkeleton';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  fashion: <Shirt className="h-5 w-5" />,
  electronics: <Monitor className="h-5 w-5" />,
  home: <Home className="h-5 w-5" />,
  vehicles: <Car className="h-5 w-5" />,
  sports: <Dumbbell className="h-5 w-5" />,
  books: <BookOpen className="h-5 w-5" />,
  food: <UtensilsCrossed className="h-5 w-5" />,
};

interface ListingData {
  id: string;
  title: string;
  price: number;
  photos: string[];
  created_at: string;
  district: string;
  condition: string;
  category: string;
  boosted_until: string | null;
  stock: number;
  user_id: string;
  original_price: number | null;
  users?: { full_name: string; avatar_url: string | null } | null;
}

interface ListingCardMapped {
  id: string;
  title: string;
  price: number;
  photos: string[];
  created_at: string;
  district: string;
  condition: string;
  category: string;
  boosted_until: string | null;
  stock: number;
  listing_user_id: string;
  seller: { name: string; avatar: string | null };
  is_favorite: boolean;
  cart_qty?: number;
  original_price: number | null;
}

const HomePage: React.FC = () => {
  useSEO('Accueil', {
    description: "Achetez et vendez à Daloa (Côte d'Ivoire) en toute simplicité sur DaloaMarket. Publiez des annonces gratuitement et trouvez des bonnes affaires locales près de chez vous.",
    keywords: "DaloaMarket, acheter Daloa, vendre Daloa, Côte d'Ivoire, petites annonces, marketplace locale, e-commerce Daloa, Côte d'Ivoire marketplace",
    canonical: 'https://daloamarket.shop'
  });
  const navigate = useNavigate();
  const { user, userProfile } = useSupabase();

  const [listings, setListings] = useState<ListingData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLocationWarning, setShowLocationWarning] = useState(false);

  useEffect(() => {
    if (!user || !userProfile) {
      setShowLocationWarning(false);
      return;
    }
    const hasLocation = (userProfile as any)?.shop_latitude != null && (userProfile as any)?.shop_longitude != null;
    if (hasLocation) {
      setShowLocationWarning(false);
      return;
    }
    const checkActiveListings = async () => {
      try {
        const { count, error: countErr } = await supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .neq('status', 'deleted')
          .neq('status', 'sold');
        if (!countErr && count && count > 0) {
          setShowLocationWarning(true);
        }
      } catch (err) {
        console.error('Error checking active listings for warning:', err);
      }
    };
    checkActiveListings();
  }, [user, userProfile]);

  const { items: cartItems } = useCart();
  const cartQtyByListingId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cartItems) {
      map[item.listing_id] = (map[item.listing_id] || 0) + item.quantity;
    }
    return map;
  }, [cartItems]);

  const fetchListings = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Base de données non configurée');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: boostedData } = await supabase
        .from('listings')
        .select('*, users!listings_user_id_fkey(full_name, avatar_url)')
        .eq('status', 'active')
        .gt('boosted_until', new Date().toISOString())
        .order('boosted_until', { ascending: false })
        .limit(6);

      const boostedListings = (boostedData || []) as ListingData[];
      const boostedIds = new Set(boostedListings.map(b => b.id));

      const { data, error: fetchError } = await supabase
        .from('listings')
        .select('*, users!listings_user_id_fkey(full_name, avatar_url)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(30);

      if (fetchError) throw fetchError;

      const rawListings = (data || []) as ListingData[];
      const filteredRaw = rawListings.filter(l => !boostedIds.has(l.id));

      // Diversification pour éviter qu'un seul vendeur n'accapare le fil d'actualité
      const diversifiedListings = diversifySellers(filteredRaw, 2);
      
      const combined = [...boostedListings, ...diversifiedListings].slice(0, 20);
      setListings(interleaveBoosted(combined));
    } catch (err: unknown) {
      console.error('HomePage fetch error:', err);
      const message = err instanceof Error ? err.message : (isSupabaseConfigured ? 'Impossible de charger les annonces' : 'Base de données non configurée');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const mapToListingCard = (l: ListingData): ListingCardMapped => ({
    id: l.id,
    title: l.title,
    price: l.price,
    photos: l.photos || [],
    created_at: l.created_at,
    district: l.district,
    condition: l.condition,
    category: l.category,
    boosted_until: l.boosted_until,
    stock: l.stock || 1,
    listing_user_id: l.user_id,
    original_price: l.original_price || null,
    seller: {
      name: l.users?.full_name || 'Anonyme',
      avatar: l.users?.avatar_url || null,
    },
    is_favorite: false,
    cart_qty: cartQtyByListingId[l.id] || 0,
  });

  return (
    <motion.div
      className="min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
    >
      {showLocationWarning && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex gap-3 items-center justify-between shadow-sm">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-800 text-left">Emplacement boutique manquant</h4>
              <p className="text-xs text-amber-700 mt-0.5 text-left">
                Vous avez des annonces actives, mais la localisation GPS de votre boutique n'est pas configurée. Elle est requise pour le calcul des distances et des frais de livraison.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            color="primary"
            variant="filled"
            onClick={() => navigate('/settings?tab=boutique')}
            className="flex-shrink-0 text-xs font-semibold"
          >
            Configurer
          </Button>
        </div>
      )}

      {/* HERO */}
      <section
        className="relative overflow-hidden px-4 pt-10 pb-12 md:pt-16 md:pb-20 lg:px-12 lg:pt-24 lg:pb-28"
        style={{ background: 'var(--gradient-hero)' }}
      >
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-6 -right-12 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 left-1/3 w-64 h-64 rounded-full bg-white/5 blur-3xl" />

        <div className="max-w-2xl lg:max-w-none mx-auto lg:px-8 relative z-10">
          <div className="lg:flex lg:items-center lg:gap-12">
            {/* LEFT COLUMN */}
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                className="mx-auto mb-5 w-20 h-20 md:w-24 md:h-24 lg:mx-0 bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-md border border-white/20 flex items-center justify-center"
                initial={{ opacity: 0, y: -24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                <img
                  src="/logo.png"
                  alt="DaloaMarket"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </motion.div>

              <motion.h1
                className="text-white text-3xl md:text-5xl font-bold mb-2 tracking-tight"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                DaloaMarket
              </motion.h1>

              <motion.p
                className="text-white/80 text-base md:text-lg mb-7"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                Achetez et vendez près de chez vous, à Daloa
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Link
                  to="/create-listing"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm active:scale-[0.97] transition-all mb-5 no-underline"
                  style={{
                    background: '#fff',
                    color: 'var(--color-primary)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                  }}
                >
                  <Plus className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                  Vendre un article
                </Link>
              </motion.div>
            </div>

            {/* RIGHT COLUMN - stats, only on lg+ */}
            <motion.div
              className="hidden lg:grid lg:grid-cols-1 lg:gap-4 lg:w-64"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <div
                className="bg-white/80 backdrop-blur-md rounded-2xl p-4 text-center shadow-lg border border-white/50"
                style={{ boxShadow: 'var(--elevation-2)' }}
              >
                <div className="flex items-center justify-center mb-2">
                  <Shield className="h-7 w-7 text-[var(--color-primary)]" />
                </div>
                <p className="text-sm font-bold text-[var(--color-on-surface)]">Gratuit</p>
                <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                  Publication sans frais
                </p>
              </div>

              <div
                className="bg-white/80 backdrop-blur-md rounded-2xl p-4 text-center shadow-lg border border-white/50"
                style={{ boxShadow: 'var(--elevation-2)' }}
              >
                <div className="flex items-center justify-center mb-2">
                  <MapPin className="h-7 w-7 text-[var(--color-primary)]" />
                </div>
                <p className="text-sm font-bold text-[var(--color-on-surface)]">Local</p>
                <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                  Vendeurs autour de vous
                </p>
              </div>

              <div
                className="bg-white/80 backdrop-blur-md rounded-2xl p-4 text-center shadow-lg border border-white/50"
                style={{ boxShadow: 'var(--elevation-2)' }}
              >
                <div className="flex items-center justify-center mb-2">
                  <Lock className="h-7 w-7 text-[var(--color-primary)]" />
                </div>
                <p className="text-sm font-bold text-[var(--color-on-surface)]">Protégé</p>
                <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                  Paiement garanti & Protection acheteur
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* STATS - only show on mobile/tablet (below hero) */}
      <section className="px-4 -mt-6 relative z-20 lg:hidden">
        <div className="max-w-2xl lg:max-w-6xl mx-auto grid grid-cols-3 gap-3">
          <motion.div
            className="bg-white/80 backdrop-blur-md rounded-2xl p-4 text-center shadow-lg border border-white/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            style={{ boxShadow: 'var(--elevation-2)' }}
          >
            <div className="flex items-center justify-center mb-2">
              <Shield className="h-7 w-7 text-[var(--color-primary)]" />
            </div>
            <p className="text-sm font-bold text-[var(--color-on-surface)]">Gratuit</p>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
              Publication sans frais
            </p>
          </motion.div>

          <motion.div
            className="bg-white/80 backdrop-blur-md rounded-2xl p-4 text-center shadow-lg border border-white/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            style={{ boxShadow: 'var(--elevation-2)' }}
          >
            <div className="flex items-center justify-center mb-2">
              <MapPin className="h-7 w-7 text-[var(--color-primary)]" />
            </div>
            <p className="text-sm font-bold text-[var(--color-on-surface)]">Local</p>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
              Vendeurs autour de vous
            </p>
          </motion.div>

          <motion.div
            className="bg-white/80 backdrop-blur-md rounded-2xl p-4 text-center shadow-lg border border-white/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            style={{ boxShadow: 'var(--elevation-2)' }}
          >
            <div className="flex items-center justify-center mb-2">
              <Lock className="h-7 w-7 text-[var(--color-primary)]" />
            </div>
            <p className="text-sm font-bold text-[var(--color-on-surface)]">Protégé</p>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
              Paiement garanti & Protection acheteur
            </p>
          </motion.div>
        </div>
      </section>

      {/* DALOADELIVERY BANNER */}
      <section className="px-4 py-3">
        <a
          href="https://daloa-delivery.shop"
          target="_blank"
          rel="noopener noreferrer"
          className="block max-w-2xl lg:max-w-6xl mx-auto px-5 py-4 bg-gradient-to-r from-[var(--color-primary-50)] to-orange-50 rounded-2xl border border-[var(--color-primary)]/10 no-underline hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏍️</span>
              <div>
                <p className="text-[14px] font-semibold text-[var(--color-on-surface)]">
                  Besoin d'un livreur ?
                </p>
                <p className="text-[12px] text-[var(--color-on-surface-variant)]">
                  Trouvez un livreur de confiance sur DaloaDelivery
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-[var(--color-primary)]" />
          </div>
        </a>
      </section>

      {/* CATEGORIES */}
      <section className="pt-8 pb-4">
        <SectionHeader
          title="Categories"
          action={{
            label: 'Voir tout',
            onClick: () => navigate('/search'),
          }}
        />
        <div className="px-4 lg:px-8">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.4 }}
          >
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + i * 0.05, duration: 0.3 }}
              >
                <Link
                  to={`/search?category=${cat.id}`}
                  className="no-underline"
                >
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-gray-100 hover:border-[var(--color-primary)]/30 hover:shadow-md active:scale-[0.97] transition-all duration-200"
                    style={{ boxShadow: 'var(--elevation-1)' }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                      {CATEGORY_ICONS[cat.id] || <ChevronRight className="h-5 w-5 text-[var(--color-primary)]" />}
                    </div>
                    <span className="flex-1 text-sm font-semibold text-[var(--color-on-surface)] truncate">
                      {cat.label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[var(--color-on-surface-variant)] flex-shrink-0" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* LATEST LISTINGS WITH CATEGORY TABS */}
      <section className="py-4">
        <SectionHeader
          title="Dernieres annonces"
          action={{
            label: 'Voir tout',
            onClick: () => navigate('/search'),
          }}
        />

        {/* Category filter pills */}
        <div className="px-4 lg:px-8 mb-4 overflow-x-auto no-scrollbar flex items-center gap-2 pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 active:scale-95',
              selectedCategory === 'all'
                ? 'bg-[var(--color-primary)] text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
            )}
          >
            Tous les articles
          </button>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 flex items-center gap-1.5 active:scale-95',
                  isSelected
                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                )}
              >
                {CATEGORY_ICONS[cat.id]}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="px-4 lg:px-8">
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          )}

          {error && !loading && (
            <ErrorState
              message={error}
              onRetry={fetchListings}
            />
          )}

          {!loading && !error && listings.length === 0 && (
            <EmptyState
              title="Aucune annonce pour le moment"
              description="Soyez le premier à publier une annonce sur DaloaMarket."
              action={{
                label: 'Publier une annonce',
                onClick: () => navigate('/create-listing'),
              }}
            />
          )}

          {!loading && !error && listings.length > 0 && (() => {
            const filteredListings = selectedCategory === 'all' 
              ? listings 
              : listings.filter(l => l.category === selectedCategory);

            if (filteredListings.length === 0) {
              return (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center my-2">
                  <p className="text-sm font-semibold text-gray-900 mb-1">Aucun article dans cette catégorie pour l'instant</p>
                  <p className="text-xs text-gray-500 mb-4">Soyez le premier à publier dans cette catégorie !</p>
                  <Button color="primary" size="sm" onClick={() => navigate('/create-listing')}>
                    Publier une annonce
                  </Button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                {filteredListings.map((listing, index) => (
                  <ListingCard
                    key={listing.id}
                    listing={mapToListingCard(listing)}
                    index={index}
                  />
                ))}
              </div>
            );
          })()}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-8">
        <motion.div
          className="max-w-2xl lg:max-w-none mx-auto lg:px-8 rounded-2xl p-6 md:p-8 text-center bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-lg md:text-xl font-bold text-[var(--color-on-surface)] mb-2">
            Nouveau sur DaloaMarket ?
          </h2>
          <p className="text-sm text-[var(--color-on-surface-variant)] mb-5">
            Decouvrez le fonctionnement
          </p>
          <Button
            variant="filled"
            color="primary"
            size="lg"
            onClick={() => navigate('/how-it-works')}
          >
            Voir comment ça marche
          </Button>
        </motion.div>
      </section>

      {/* Spacer for bottom nav */}
      <div className="h-20 lg:hidden" />
    </motion.div>
  );
};

export default HomePage;
