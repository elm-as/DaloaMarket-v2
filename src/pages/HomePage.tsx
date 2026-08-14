import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Car,
  ChevronRight,
  Dumbbell,
  Home,
  Lock,
  MapPin,
  Monitor,
  Plus,
  Search,
  Shield,
  Shirt,
  Sparkles,
  UtensilsCrossed,
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

const CATEGORY_STYLE: Record<string, { icon: React.ReactNode; bg: string; border: string }> = {
  fashion: { icon: <Shirt className="h-5 w-5" />, bg: 'bg-pink-50 text-pink-600', border: 'border-pink-200' },
  electronics: { icon: <Monitor className="h-5 w-5" />, bg: 'bg-blue-50 text-blue-600', border: 'border-blue-200' },
  home: { icon: <Home className="h-5 w-5" />, bg: 'bg-amber-50 text-amber-600', border: 'border-amber-200' },
  vehicles: { icon: <Car className="h-5 w-5" />, bg: 'bg-red-50 text-red-600', border: 'border-red-200' },
  sports: { icon: <Dumbbell className="h-5 w-5" />, bg: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-200' },
  books: { icon: <BookOpen className="h-5 w-5" />, bg: 'bg-cyan-50 text-cyan-600', border: 'border-cyan-200' },
  food: { icon: <UtensilsCrossed className="h-5 w-5" />, bg: 'bg-orange-50 text-orange-600', border: 'border-orange-200' },
};

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
  variants?: { id: string; label: string; price: number | null; stock: number; active?: boolean }[];
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
  variants?: { id: string; label: string; price: number | null; stock: number; active?: boolean }[];
}

const HomePage: React.FC = () => {
  useSEO('Accueil', {
    description: "Achetez et vendez à Daloa (Côte d'Ivoire) en toute simplicité sur DaloaMarket. Publiez des annonces gratuitement et trouvez des bonnes affaires locales près de chez vous.",
    keywords: "DaloaMarket, acheter Daloa, vendre Daloa, Côte d'Ivoire, petites annonces, marketplace locale, e-commerce Daloa, Côte d'Ivoire marketplace",
    canonical: 'https://daloamarket.com'
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

      const rawListings = (data || []) as unknown as ListingData[];
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
    variants: l.variants || [],
    seller: {
      name: l.users?.full_name || 'Anonyme',
      avatar: l.users?.avatar_url || null,
    },
    is_favorite: false,
    cart_qty: cartQtyByListingId[l.id] || 0,
  });

  return (
    <motion.div
      className="min-h-screen bg-gray-50/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
    >
      {showLocationWarning && (
        <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-white px-4 py-3 shadow-sm shadow-orange-100/60">
          <div className="flex min-w-0 items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-500" />
            <div className="min-w-0">
              <h4 className="text-left text-sm font-bold text-gray-900">Emplacement boutique manquant</h4>
              <p className="mt-0.5 text-left text-xs text-gray-600">
                Configurez votre localisation pour calculer les distances et les frais de livraison.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            color="primary"
            variant="filled"
            onClick={() => navigate('/settings?tab=boutique')}
            className="flex-shrink-0 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-xs font-extrabold"
          >
            Configurer
          </Button>
        </div>
      )}

      {/* HERO — NOUVEAU DESIGN MODERNE THEME DM */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-amber-600 px-4 pt-6 pb-12 rounded-b-[36px] shadow-lg shadow-orange-500/20 sm:px-6 md:pb-16 md:pt-12 lg:px-12 lg:pt-16">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute -top-12 -right-10 w-44 h-44 rounded-full bg-white/15 blur-xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-8 w-36 h-36 rounded-full bg-white/10 blur-xl" />
        <div className="pointer-events-none absolute top-1/3 left-1/2 w-48 h-48 -translate-x-1/2 rounded-full bg-amber-300/10 blur-2xl" />

        <div className="relative z-10 mx-auto max-w-2xl lg:max-w-5xl">
          <div className="lg:flex lg:items-center lg:justify-between lg:gap-12">
            <div className="flex-1 text-left">
              {/* Brand Pill Badge */}
              <motion.div
                className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-[11px] font-black text-white border border-white/25 shadow-xs"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
                <span>Le marché local de Daloa</span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.12]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                Tout Daloa,{' '}
                <span className="bg-gradient-to-r from-amber-200 via-amber-100 to-yellow-200 bg-clip-text text-transparent block sm:inline">
                  au même endroit.
                </span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                className="mt-2.5 max-w-md text-xs sm:text-sm font-medium text-orange-100/90 leading-relaxed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                Achetez et vendez facilement entre voisins. Paiement 100% protégé et livraison partout dans la ville.
              </motion.p>

              {/* Search Bar & Action Buttons */}
              <motion.div
                className="mt-4 max-w-xl space-y-2.5"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                {/* Search Trigger */}
                <Link
                  to="/search"
                  className="flex h-12 w-full items-center gap-3 rounded-2xl bg-white px-3.5 text-left shadow-xl shadow-orange-950/15 transition-all active:scale-[0.99] border border-orange-100/60 group"
                  aria-label="Rechercher une annonce"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-50 text-orange-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Search className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-xs sm:text-sm font-semibold text-gray-400">
                    Rechercher un produit, un quartier...
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-extrabold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-xl">
                    Explorer <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    to="/create-listing"
                    className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-white px-4 text-xs font-black text-orange-600 shadow-md shadow-orange-950/10 hover:bg-orange-50 active:scale-95 transition-all"
                  >
                    <Plus className="h-4 w-4 stroke-[3]" />
                    <span>Vendre un article</span>
                  </Link>
                  <Link
                    to="/search"
                    className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 px-4 text-xs font-extrabold text-white hover:bg-white/30 active:scale-95 transition-all"
                  >
                    <span>Voir les annonces</span>
                  </Link>
                </div>
              </motion.div>
            </div>

            {/* Desktop Side Feature Cards */}
            <motion.div
              className="hidden w-64 grid-cols-1 gap-3 lg:grid"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <div className="rounded-3xl border border-white/30 bg-white/20 backdrop-blur-md p-4 text-white shadow-lg">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-black">Escrow Sécurisé</span>
                </div>
                <p className="text-[11px] text-orange-100 font-medium">Paiement protégé jusqu'à réception</p>
              </div>

              <div className="rounded-3xl border border-white/30 bg-white/20 backdrop-blur-md p-4 text-white shadow-lg">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-black">100% Local</span>
                </div>
                <p className="text-[11px] text-orange-100 font-medium">Vendeurs et livreurs à Daloa</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FLOATING TRUST BAR (OVERLAPPING HERO) ── */}
      <section className="relative z-20 -mt-6 px-4">
        <motion.div
          className="mx-auto max-w-2xl bg-white rounded-3xl p-3 border border-gray-100 shadow-lg shadow-gray-200/50 flex items-center justify-around gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.35 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Shield className="h-4 w-4" />
            </div>
            <div className="text-left">
              <span className="text-xs font-extrabold text-gray-900 block leading-tight">Escrow</span>
              <span className="text-[10px] text-gray-400 font-semibold hidden sm:inline">Paiement garanti</span>
            </div>
          </div>

          <div className="h-5 w-px bg-gray-100" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="text-left">
              <span className="text-xs font-extrabold text-gray-900 block leading-tight">Local</span>
              <span className="text-[10px] text-gray-400 font-semibold hidden sm:inline">Vendeurs Daloa</span>
            </div>
          </div>

          <div className="h-5 w-px bg-gray-100" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="text-left">
              <span className="text-xs font-extrabold text-gray-900 block leading-tight">Gratuit</span>
              <span className="text-[10px] text-gray-400 font-semibold hidden sm:inline">Sans commission</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* DALOADELIVERY BANNER */}
      <section className="px-4 pt-4 pb-1">
        <a
          href="https://delivery.daloamarket.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 max-w-2xl lg:max-w-5xl mx-auto px-4 py-2.5 bg-white rounded-2xl shadow-sm border border-orange-100/80 no-underline active:scale-[0.99] hover:bg-orange-50/50 transition-all group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base flex-shrink-0">🏍️</span>
            <p className="text-xs font-medium text-gray-700 truncate">
              Besoin d'une course ou d'un livreur ? <span className="text-orange-600 font-extrabold">DaloaDelivery</span>
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-orange-500 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </section>

      {/* CATEGORIES — grille de découverte, desktop uniquement (sur mobile la rangée de pills ci-dessous suffit) */}
      <section className="hidden lg:block pt-8 pb-4">
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

      {/* MOBILE CATEGORY STRIP — Pills fluides sans troncature */}
      <section className="pb-2 pt-5 lg:hidden">
        <SectionHeader
          title="Explorer par catégorie"
          action={{
            label: 'Tout voir',
            onClick: () => navigate('/search'),
          }}
        />
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 pb-2 pt-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            aria-pressed={selectedCategory === 'all'}
            className={cn(
              'flex h-10 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-xs font-extrabold transition-all active:scale-95 whitespace-nowrap shadow-2xs',
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/20'
                : 'border border-gray-200/80 bg-white text-gray-700 hover:border-orange-300 hover:text-orange-600'
            )}
          >
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-xl transition-colors',
                selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-600'
              )}
            >
              <Search className="h-3.5 w-3.5" />
            </div>
            <span>Toutes les annonces</span>
          </button>

          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const style = CATEGORY_STYLE[cat.id] || {
              icon: <Search className="h-3.5 w-3.5" />,
              bg: 'bg-orange-50 text-orange-600',
              border: 'border-orange-100',
            };

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                aria-pressed={isSelected}
                className={cn(
                  'flex h-10 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-xs font-extrabold transition-all active:scale-95 whitespace-nowrap shadow-2xs',
                  isSelected
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/20'
                    : 'border border-gray-200/80 bg-white text-gray-700 hover:border-orange-300 hover:text-orange-600'
                )}
              >
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-xl transition-colors',
                    isSelected ? 'bg-white/20 text-white' : style.bg
                  )}
                >
                  {style.icon}
                </div>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* LATEST LISTINGS */}
      <section className="pb-4 pt-6 lg:pt-8">
        <SectionHeader
          title={selectedCategory === 'all' ? 'Dernières annonces' : `Annonces · ${CATEGORIES.find((cat) => cat.id === selectedCategory)?.label || 'Sélection'}`}
          action={{
            label: 'Voir tout',
            onClick: () => navigate('/search'),
          }}
        />

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
                <div className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 p-8 text-center my-2">
                  <p className="text-sm font-extrabold text-gray-900 mb-1">Aucun article dans cette catégorie pour l'instant</p>
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

      {/* CTA — rappel visible après le premier lot d'annonces */}
      <section className="px-4 py-7 lg:py-8">
        <motion.div
          className="mx-auto max-w-2xl rounded-[28px] bg-gradient-to-br from-orange-500 to-amber-600 p-6 text-center shadow-lg shadow-orange-200/50 md:p-8 lg:max-w-none lg:px-8"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="mb-2 text-lg font-extrabold text-white md:text-xl">
            Une annonce à publier ?
          </h2>
          <p className="mb-5 text-sm text-orange-100">
            Vendez simplement, gratuitement, partout à Daloa.
          </p>
          <Link
            to="/create-listing"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-extrabold text-orange-600 shadow-md transition-all active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            Publier une annonce
          </Link>
        </motion.div>
      </section>

      {/* Petit espace de respiration en fin de fil (le padding bottom de la nav est géré par AppLayout) */}
      <div className="h-5 lg:hidden" />
    </motion.div>
  );
};

export default HomePage;
