import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Bike,
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
  Tag,
  Zap,
  Package,
} from 'lucide-react';

import { useSupabase } from '../hooks/useSupabase';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useSEO } from '../hooks/useSEO';
import { formatPrice, interleaveBoosted, diversifySellers, CATEGORIES, cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { useCart } from '../contexts/CartContext';
import { SectionHeader } from '../components/ui/SectionHeader';
import ListingCard from '../components/listings/ListingCard';
import ListingCardSkeleton from '../components/listings/ListingCardSkeleton';
import { userBehaviorService } from '../services/userBehaviorService';

const CATEGORY_STYLE: Record<string, { icon: React.ReactNode; bg: string; border: string; emoji: string }> = {
  fashion: { icon: <Shirt className="h-4 w-4" />, bg: 'bg-pink-50 text-pink-600', border: 'border-pink-200', emoji: '👗' },
  electronics: { icon: <Monitor className="h-4 w-4" />, bg: 'bg-blue-50 text-blue-600', border: 'border-blue-200', emoji: '📱' },
  home: { icon: <Home className="h-4 w-4" />, bg: 'bg-amber-50 text-amber-600', border: 'border-amber-200', emoji: '🛋️' },
  vehicles: { icon: <Car className="h-4 w-4" />, bg: 'bg-red-50 text-red-600', border: 'border-red-200', emoji: '🚗' },
  sports: { icon: <Dumbbell className="h-4 w-4" />, bg: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-200', emoji: '⚽' },
  books: { icon: <BookOpen className="h-4 w-4" />, bg: 'bg-cyan-50 text-cyan-600', border: 'border-cyan-200', emoji: '📚' },
  food: { icon: <UtensilsCrossed className="h-4 w-4" />, bg: 'bg-orange-50 text-orange-600', border: 'border-orange-200', emoji: '🍲' },
};

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  fashion: ['fashion', 'mode', 'Mode & Accessoires', 'vetements', 'chaussures', 'accessoires'],
  electronics: ['electronics', 'electronique', 'Électronique & High-tech', 'high-tech', 'telephone', 'informatique'],
  home: ['home', 'maison', 'maison-deco', 'Maison & Jardin', 'meubles', 'electromenager'],
  vehicles: ['vehicles', 'vehicules', 'Auto & Moto', 'voiture', 'moto'],
  sports: ['sports', 'sports-loisirs', 'Sports & Loisirs', 'sport'],
  books: ['books', 'livres', 'Livres & Culture', 'scolaire', 'culture'],
  food: ['food', 'alimentaire', 'Alimentaire', 'Alimentaire & Produits locaux', 'nourriture', 'produits locaux'],
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

interface CachedFeed {
  listings: ListingData[];
  timestamp: number;
}

// Module-level cache to ensure instantaneous rendering and pixel-perfect scroll restoration when returning to Home
const homeFeedCache = new Map<string, CachedFeed>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes fresh cache

const HomePage: React.FC = () => {
  useSEO('Accueil', {
    description: "Achetez et vendez à Daloa (Côte d'Ivoire) en toute simplicité sur DaloaMarket. Publiez des annonces gratuitement et trouvez des bonnes affaires locales près de chez vous.",
    keywords: "DaloaMarket, acheter Daloa, vendre Daloa, Côte d'Ivoire, petites annonces, marketplace locale, e-commerce Daloa, Côte d'Ivoire marketplace",
    canonical: 'https://daloamarket.com'
  });
  const navigate = useNavigate();
  const { user, userProfile } = useSupabase();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [listings, setListings] = useState<ListingData[]>(() => {
    const cached = homeFeedCache.get('all');
    return cached?.listings || [];
  });
  const [loading, setLoading] = useState(() => !homeFeedCache.has('all'));
  const [error, setError] = useState<string | null>(null);
  const [showLocationWarning, setShowLocationWarning] = useState(false);

  // Hydrate le moteur de reco avec les favoris Supabase de l'utilisateur (persistant, cross-device)
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('favorites')
      .select('listing:listing_id(id, title, price, category, district, description)')
      .eq('user_id', user.id)
      .limit(50)
      .then(({ data }) => {
        if (!data?.length) return;
        const favListings = data.map((row: any) => row.listing).filter(Boolean);
        if (favListings.length) userBehaviorService.hydrateFavorites(favListings);
      })
      .catch(() => {/* silencieux */});
  }, [user?.id]);

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

  const fetchListings = useCallback(async (cat: string) => {
    if (!isSupabaseConfigured) {
      setError('Base de données non configurée');
      setLoading(false);
      return;
    }

    const cached = homeFeedCache.get(cat);
    const isCacheFresh = cached && (Date.now() - cached.timestamp < CACHE_TTL_MS);

    if (cached) {
      // Instantly serve from cache
      setListings(cached.listings);
      setLoading(false);
      // If cache is still fresh, no need to refetch right now
      if (isCacheFresh) return;
    } else {
      setLoading(true);
    }

    setError(null);
    try {
      if (cat === 'all') {
        // Mode général : annonces boostées + dernières annonces diversifiées
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

        const diversifiedListings = diversifySellers(filteredRaw, 2);
        const combined = [...boostedListings, ...diversifiedListings].slice(0, 24);
        const finalList = interleaveBoosted(combined);
        homeFeedCache.set(cat, { listings: finalList, timestamp: Date.now() });
        setListings(finalList);
      } else {
        // Mode catégorie ciblée : interroger la base avec tous les synonymes
        const synonyms = CATEGORY_SYNONYMS[cat] || [cat];
        const { data, error: fetchError } = await supabase
          .from('listings')
          .select('*, users!listings_user_id_fkey(full_name, avatar_url)')
          .eq('status', 'active')
          .in('category', synonyms)
          .order('created_at', { ascending: false })
          .limit(30);

        if (fetchError) throw fetchError;
        const finalList = (data || []) as unknown as ListingData[];
        homeFeedCache.set(cat, { listings: finalList, timestamp: Date.now() });
        setListings(finalList);
      }
    } catch (err: unknown) {
      console.error('HomePage fetch error:', err);
      const message = err instanceof Error ? err.message : (isSupabaseConfigured ? 'Impossible de charger les annonces' : 'Base de données non configurée');
      if (!cached) {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Déclencher la recherche dès que la catégorie sélectionnée change
  useEffect(() => {
    fetchListings(selectedCategory);
  }, [selectedCategory, fetchListings]);

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

  // Calcul des recommandations personnalisées IA Machine Learning
  const personalizedRecommendations = useMemo(() => {
    if (selectedCategory !== 'all' || listings.length === 0) return [];
    return userBehaviorService.getPersonalizedRecommendations(listings, { limit: 4, minScore: 20 });
  }, [listings, selectedCategory]);

  const currentCategoryObj = CATEGORIES.find((cat) => cat.id === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50/70">
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

      {/* HERO — DESIGN HARMONISÉ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-orange-600 to-amber-700 px-4 pt-6 pb-12 rounded-b-[36px] shadow-lg shadow-orange-500/20 sm:px-6 md:pb-16 md:pt-10 lg:px-12">
        <div className="pointer-events-none absolute -top-12 -right-10 w-48 h-48 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-8 w-36 h-36 rounded-full bg-black/10 blur-xl" />

        <div className="relative z-10 mx-auto max-w-2xl lg:max-w-5xl">
          <div className="lg:flex lg:items-center lg:justify-between lg:gap-12">
            <div className="flex-1 text-left">
              {/* Badge Local */}
              <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-[11px] font-black text-white border border-white/20 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
                <span>Marketplace & Livraison · Daloa</span>
              </div>

              {/* Headline */}
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.12]">
                Tout Daloa,{' '}
                <span className="bg-gradient-to-r from-amber-200 via-amber-100 to-yellow-200 bg-clip-text text-transparent block sm:inline">
                  au même endroit.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="mt-2.5 max-w-md text-xs sm:text-sm font-medium text-orange-100/90 leading-relaxed">
                Achetez et vendez en toute confiance. Paiement séquestre garanti et livraison géolocalisée.
              </p>

              {/* Search Bar & Actions */}
              <div className="mt-4 max-w-xl space-y-2.5">
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

                <div className="flex items-center gap-2">
                  <Link
                    to="/create-listing"
                    className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-white px-4 text-xs font-black text-orange-600 shadow-md shadow-orange-950/10 hover:bg-orange-50 active:scale-95 transition-all"
                  >
                    <Plus className="h-4 w-4 stroke-[3]" />
                    <span>Publier une annonce</span>
                  </Link>
                  <Link
                    to="/search"
                    className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 px-4 text-xs font-extrabold text-white hover:bg-white/30 active:scale-95 transition-all"
                  >
                    <span>Tout le catalogue</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Desktop Side Highlights */}
            <div className="hidden w-64 grid-cols-1 gap-3 lg:grid">
              <div className="rounded-3xl border border-white/30 bg-white/20 backdrop-blur-md p-4 text-white shadow-lg">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-black">Séquestre Escrow</span>
                </div>
                <p className="text-[11px] text-orange-100 font-medium">Fonds bloqués jusqu'à confirmation OTP</p>
              </div>

              <div className="rounded-3xl border border-white/30 bg-white/20 backdrop-blur-md p-4 text-white shadow-lg">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-black">100% Daloa</span>
                </div>
                <p className="text-[11px] text-orange-100 font-medium">Commerçants & livreurs de proximité</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FLOATING TRUST STRIP */}
      <section className="relative z-20 -mt-6 px-4">
        <div className="mx-auto max-w-2xl bg-white rounded-3xl p-3 border border-gray-100 shadow-lg shadow-gray-200/50 flex items-center justify-around gap-2">
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
        </div>
      </section>

      {/* DALOADELIVERY LINK BANNER */}
      <section className="px-4 pt-3 pb-1">
        <a
          href="https://delivery.daloamarket.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2.5 max-w-2xl lg:max-w-5xl mx-auto px-3.5 py-2 bg-white rounded-2xl shadow-xs border border-orange-100/80 no-underline active:scale-[0.99] hover:bg-orange-50/50 transition-all group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-orange-50 text-primary flex items-center justify-center flex-shrink-0">
              <Bike className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-gray-700 truncate">
              Besoin d'un coursier ? <span className="text-primary font-black">DaloaDelivery</span>
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </section>

      {/* CATEGORY SELECTOR STRIP — PILLS COMPACTES ET FLUIDES */}
      <section className="pt-3 pb-1">
        <div className="px-4 lg:px-8 max-w-5xl mx-auto">
          <SectionHeader
            title="Explorer par catégorie"
            action={{
              label: 'Tout voir',
              onClick: () => navigate(selectedCategory === 'all' ? '/search' : `/search?category=${selectedCategory}`),
            }}
          />
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 -mx-4 px-4 sm:mx-0 sm:px-0">
            {/* Pill: Toutes les annonces */}
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              aria-pressed={selectedCategory === 'all'}
              className={cn(
                'flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all active:scale-95 whitespace-nowrap shadow-2xs',
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-orange-500 via-primary to-amber-600 text-white shadow-xs font-black'
                  : 'border border-gray-200/80 bg-white text-gray-700 hover:border-orange-300 hover:text-primary'
              )}
            >
              <Search className={cn('h-3.5 w-3.5', selectedCategory === 'all' ? 'text-white' : 'text-primary')} />
              <span>Toutes</span>
            </button>

            {/* Category Pills */}
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const style = CATEGORY_STYLE[cat.id] || {
                icon: <Tag className="h-3.5 w-3.5" />,
                bg: 'text-primary',
                border: 'border-orange-100',
              };

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all active:scale-95 whitespace-nowrap shadow-2xs',
                    isSelected
                      ? 'bg-gradient-to-r from-orange-500 via-primary to-amber-600 text-white shadow-xs font-black'
                      : 'border border-gray-200/80 bg-white text-gray-700 hover:border-orange-300 hover:text-primary'
                  )}
                >
                  <span className={cn('flex items-center justify-center', isSelected ? 'text-white' : style.bg)}>
                    {style.icon}
                  </span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION RECOMMANDATIONS PERSONNALISÉES */}
      {selectedCategory === 'all' && personalizedRecommendations.length > 0 && !loading && (
        <section className="pt-2 pb-2">
          <div className="px-4 lg:px-8 max-w-5xl mx-auto">
            <SectionHeader title="Pour vous" />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mt-1.5">
              {personalizedRecommendations.map((rec, idx) => (
                <ListingCard
                  key={`rec-${rec.item.id}`}
                  listing={{
                    ...mapToListingCard(rec.item as ListingData),
                    similarityPercent: rec.similarityPercent,
                    matchReason: rec.matchReason,
                  }}
                  index={idx}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LISTINGS FEED */}
      <section className="pb-8 pt-1">
        <div className="px-4 lg:px-8 max-w-5xl mx-auto">
          <SectionHeader
            title={selectedCategory === 'all' ? 'Dernières annonces' : (currentCategoryObj?.label || 'Catégorie')}
            action={{
              label: 'Voir tout',
              onClick: () => navigate(selectedCategory === 'all' ? '/search' : `/search?category=${selectedCategory}`),
            }}
          />

          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mt-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          )}

          {error && !loading && (
            <ErrorState
              message={error}
              onRetry={() => fetchListings(selectedCategory)}
            />
          )}

          {!loading && !error && listings.length === 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/40 p-6 sm:p-8 text-center my-2 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-primary flex items-center justify-center mx-auto mb-3 shadow-inner">
                {currentCategoryObj ? (CATEGORY_STYLE[currentCategoryObj.id]?.icon || <Package className="w-5 h-5" />) : <Search className="w-5 h-5" />}
              </div>
              <h3 className="text-sm font-black text-gray-900 mb-1">
                {selectedCategory === 'all'
                  ? 'Aucune annonce disponible'
                  : `Aucun article en ${currentCategoryObj?.label || selectedCategory}`}
              </h3>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Soyez le tout premier vendeur à publier dans cette catégorie à Daloa !
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  color="primary"
                  size="sm"
                  onClick={() => navigate('/create-listing')}
                  className="rounded-xl shadow-xs font-black text-xs h-10"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Publier une annonce
                </Button>
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                  className="rounded-xl font-bold text-xs h-10 border-gray-200 text-gray-700"
                >
                  Toutes les annonces
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && listings.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mt-1.5">
              {listings.map((listing, index) => (
                <ListingCard
                  key={listing.id}
                  listing={mapToListingCard(listing)}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* BOTTOM CTA BANNER */}
      <section className="px-4 pb-12">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl bg-gradient-to-br from-primary via-orange-600 to-amber-600 p-6 sm:p-8 text-center text-white shadow-xl shadow-orange-500/20">
            <h2 className="text-lg sm:text-2xl font-black mb-2 tracking-tight">
              Vous avez un article à vendre ?
            </h2>
            <p className="text-xs sm:text-sm text-orange-100 max-w-md mx-auto mb-5 font-medium leading-relaxed">
              Publiez gratuitement en moins de 2 minutes et trouvez des acheteurs dans toute la ville de Daloa.
            </p>
            <Link
              to="/create-listing"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-xs font-black text-primary shadow-lg hover:bg-orange-50 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Déposer une annonce gratuite</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
