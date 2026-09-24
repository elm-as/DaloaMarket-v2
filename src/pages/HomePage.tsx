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
  Flame,
} from 'lucide-react';

import { useSupabase } from '../hooks/useSupabase';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useSEO } from '../hooks/useSEO';
import { formatPrice, interleaveBoosted, diversifySellers, CATEGORIES, cn } from '../lib/utils';
import { getCategoryById, getCategoryPath } from '../lib/categoryCatalog';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { useCart } from '../contexts/CartContext';
import { SectionHeader } from '../components/ui/SectionHeader';
import ListingCard from '../components/listings/ListingCard';
import ListingCardSkeleton from '../components/listings/ListingCardSkeleton';
import { userBehaviorService } from '../services/userBehaviorService';
import { getTrendingRecommendations } from '../lib/feedCuration';
import { HomeForYouSection } from '../components/home/HomeForYouSection';

const CATEGORY_STYLE: Record<string, { icon: React.ReactNode; bg: string; border: string; emoji: string }> = {
  fashion: { icon: <Shirt className="h-4 w-4" />, bg: 'bg-pink-50 text-pink-600', border: 'border-pink-200', emoji: '👗' },
  electronics: { icon: <Monitor className="h-4 w-4" />, bg: 'bg-blue-50 text-blue-600', border: 'border-blue-200', emoji: '📱' },
  home: { icon: <Home className="h-4 w-4" />, bg: 'bg-amber-50 text-amber-600', border: 'border-amber-200', emoji: '🛋️' },
  vehicles: { icon: <Car className="h-4 w-4" />, bg: 'bg-red-50 text-red-600', border: 'border-red-200', emoji: '🚗' },
  beauty: { icon: <Sparkles className="h-4 w-4" />, bg: 'bg-fuchsia-50 text-fuchsia-600', border: 'border-fuchsia-200', emoji: '💄' },
  sports: { icon: <Dumbbell className="h-4 w-4" />, bg: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-200', emoji: '⚽' },
  books: { icon: <BookOpen className="h-4 w-4" />, bg: 'bg-cyan-50 text-cyan-600', border: 'border-cyan-200', emoji: '📚' },
  food: { icon: <UtensilsCrossed className="h-4 w-4" />, bg: 'bg-orange-50 text-orange-600', border: 'border-orange-200', emoji: '🍲' },
};

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  fashion: ['fashion', 'mode', 'Mode & Accessoires', 'vetements', 'chaussures', 'accessoires'],
  electronics: ['electronics', 'electronique', 'Électronique & High-tech', 'high-tech', 'telephone', 'informatique'],
  home: ['home', 'maison', 'maison-deco', 'Maison & Jardin', 'meubles', 'electromenager'],
  vehicles: ['vehicles', 'vehicules', 'Auto & Moto', 'voiture', 'moto'],
  beauty: ['beauty', 'beaute', 'cosmetiques', 'Beauté & Cosmétiques', 'cosmetique', 'maquillage', 'parfum', 'perruque', 'soins', 'creme'],
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

  // Hydrate le moteur de reco avec les favoris Supabase de l'utilisateur (persistant, cross-device)
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('favorites')
          .select('listing:listing_id(id, title, price, category, district, description)')
          .eq('user_id', user.id)
          .limit(50);
        if (!data?.length) return;
        const favListings = data.map((row: any) => row.listing).filter(Boolean);
        if (favListings.length) userBehaviorService.hydrateFavorites(favListings);
      } catch {
        /* silencieux */
      }
    })();
  }, [user?.id]);

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

        const boostedListings = (boostedData || []) as unknown as ListingData[];
        const boostedIds = new Set(boostedListings.map(b => b.id));

        const { data, error: fetchError } = await supabase
          .from('listings')
          .select('*, users!listings_user_id_fkey(full_name, avatar_url)')
          .eq('status', 'active')
          .order('sort_at', { ascending: false })
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
          .order('sort_at', { ascending: false })
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

  /* Une seule section de recommandations, comme sur mobile.
     « Populaire à Daloa » et « Pour vous » puisaient dans la même liste que le
     fil « Dernières annonces » juste en dessous : le même article pouvait
     apparaître trois fois sur un écran. Le personnalisé passe devant, la
     tendance complète les places libres, et les articles déjà visibles en tête
     de fil sont écartés. */
  const forYouRecommendations = useMemo(() => {
    if (selectedCategory !== 'all' || listings.length === 0) return [];

    const visibleFeedIds = new Set(listings.slice(0, 8).map((l) => l.id));

    const personalized = userBehaviorService
      .getPersonalizedRecommendations(listings, { limit: 8, minScore: 20 })
      .filter((r) => !visibleFeedIds.has(r.item.id));

    if (personalized.length >= 8) return personalized.slice(0, 8);

    const usedIds = new Set([...visibleFeedIds, ...personalized.map((r) => r.item.id)]);
    const fill = getTrendingRecommendations(listings, 16).filter((r) => !usedIds.has(r.item.id));

    return [...personalized, ...fill].slice(0, 8);
  }, [listings, selectedCategory]);

  const currentCategoryObj = CATEGORIES.find((cat) => cat.id === selectedCategory);

  /**
   * « Tout voir » mène au rayon (`/maison-deco`), pas à la recherche filtrée :
   * la page catégorie est le parcours de navigation, la recherche sert aux
   * requêtes texte. C'est aussi ce qui donne à ces URL leur maillage interne.
   */
  const browseAllPath = useCallback(() => {
    if (selectedCategory === 'all') return '/search';
    const target = getCategoryById(selectedCategory);
    return target ? getCategoryPath(target) : `/search?category=${selectedCategory}`;
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50/70">
      {/* L'alerte « emplacement boutique manquant » est sur le profil : l'accueil sert à acheter. */}

      {/* En-tête sobre : la recherche est dans la barre du haut et « Vendre »
          dans la barre du bas. L'ancien bandeau en dégradé, la bande
          « confiance » et la bannière livraison repoussaient le premier
          article sous la ligne de flottaison. */}
      <section className="px-4 pt-5 pb-1">
        <div className="mx-auto max-w-5xl lg:px-4">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            Tout Daloa, au même endroit.
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Achetez et vendez près de chez vous, paiement protégé.
          </p>
        </div>
      </section>

      {/* CATEGORY SELECTOR STRIP — PILLS COMPACTES ET FLUIDES */}
      <section className="pt-3 pb-1">
        <div className="px-4 lg:px-8 max-w-5xl mx-auto">
          <SectionHeader
            title="Explorer par catégorie"
            action={{
              label: 'Tout voir',
              to: browseAllPath(),
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

      {/* RECOMMANDATIONS : personnalisé d'abord, tendance en complément */}
      {selectedCategory === 'all' && forYouRecommendations.length > 0 && !loading && (
        <HomeForYouSection recommendations={forYouRecommendations} />
      )}

      {/* LISTINGS FEED */}
      <section className="pb-8 pt-1">
        <div className="px-4 lg:px-8 max-w-5xl mx-auto">
          <SectionHeader
            title={selectedCategory === 'all' ? 'Dernières annonces' : (currentCategoryObj?.label || 'Catégorie')}
            action={{
              label: 'Voir tout',
              to: browseAllPath(),
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
      {/* Lien DaloaDelivery, en fin de page : utile, mais pas avant les articles */}
      <section className="px-4 pb-10">
        <a
          href="https://delivery.daloamarket.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto flex max-w-5xl items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800"
        >
          <Bike className="h-4 w-4" />
          Besoin d’un coursier ? <span className="font-semibold text-[var(--color-primary-dark)]">DaloaDelivery</span>
          <ChevronRight className="h-4 w-4" />
        </a>
      </section>
    </div>
  );
};

export default HomePage;
