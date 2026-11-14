import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSupabase } from './useSupabase';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { interleaveBoosted, diversifySellers } from '../lib/utils';
import { useCart } from '../contexts/CartContext';
import { userBehaviorService } from '../services/userBehaviorService';
import { getTrendingRecommendations } from '../lib/feedCuration';

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

export interface ListingData {
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

export interface ListingCardMapped {
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

const homeFeedCache = new Map<string, CachedFeed>();
const CACHE_TTL_MS = 3 * 60 * 1000;

async function hydrateUserFavorites(userId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('favorites')
      .select('listing:listing_id(id, title, price, category, district, description)')
      .eq('user_id', userId)
      .limit(50);
    if (!data?.length) return;
    const favListings = data.map((row: { listing?: unknown }) => row.listing).filter(Boolean);
    if (favListings.length) {
      userBehaviorService.hydrateFavorites(favListings as never[]);
    }
  } catch (err) {
    console.warn('Favorites hydration skipped:', err);
  }
}

async function hasActiveListingsWithoutLocation(userId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('status', 'deleted')
      .neq('status', 'sold');
    return !error && Boolean(count && count > 0);
  } catch (err) {
    console.error('Error checking active listings for warning:', err);
    return false;
  }
}

async function fetchAllActiveListings(): Promise<ListingData[]> {
  const { data: boostedData } = await supabase
    .from('listings')
    .select('*, users!listings_user_id_fkey(full_name, avatar_url)')
    .eq('status', 'active')
    .gt('boosted_until', new Date().toISOString())
    .order('boosted_until', { ascending: false })
    .limit(6);

  const boostedListings = (boostedData || []) as unknown as ListingData[];
  const boostedIds = new Set(boostedListings.map((b) => b.id));

  const { data, error } = await supabase
    .from('listings')
    .select('*, users!listings_user_id_fkey(full_name, avatar_url)')
    .eq('status', 'active')
    .order('sort_at', { ascending: false })
    .limit(30);

  if (error) throw error;

  const rawListings = (data || []) as unknown as ListingData[];
  const filteredRaw = rawListings.filter((l) => !boostedIds.has(l.id));
  const diversifiedListings = diversifySellers(filteredRaw, 2);
  const combined = [...boostedListings, ...diversifiedListings].slice(0, 24);
  return interleaveBoosted(combined);
}

async function fetchCategoryListings(category: string): Promise<ListingData[]> {
  const synonyms = CATEGORY_SYNONYMS[category] || [category];
  const { data, error } = await supabase
    .from('listings')
    .select('*, users!listings_user_id_fkey(full_name, avatar_url)')
    .eq('status', 'active')
    .in('category', synonyms)
    .order('sort_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data || []) as unknown as ListingData[];
}

/**
 * Charge et met en cache le flux d'annonces de la page d'accueil, les
 * recommandations personnalisées et l'alerte de géolocalisation boutique.
 */
export function useHomeFeed(selectedCategory: string) {
  const { user, userProfile } = useSupabase();
  const { items: cartItems } = useCart();

  const [listings, setListings] = useState<ListingData[]>(() => {
    const cached = homeFeedCache.get('all');
    return cached?.listings || [];
  });
  const [loading, setLoading] = useState(() => !homeFeedCache.has('all'));
  const [error, setError] = useState<string | null>(null);
  const [showLocationWarning, setShowLocationWarning] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    void hydrateUserFavorites(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!user || !userProfile) {
      setShowLocationWarning(false);
      return;
    }
    const profileCoords = userProfile as { shop_latitude?: number | null; shop_longitude?: number | null };
    if (profileCoords.shop_latitude != null && profileCoords.shop_longitude != null) {
      setShowLocationWarning(false);
      return;
    }
    void hasActiveListingsWithoutLocation(user.id).then(setShowLocationWarning);
  }, [user, userProfile]);

  const cartQtyByListingId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cartItems) {
      map[item.listing_id] = (map[item.listing_id] || 0) + item.quantity;
    }
    return map;
  }, [cartItems]);

  const fetchListings = useCallback(async (category: string) => {
    if (!isSupabaseConfigured) {
      setError('Base de données non configurée');
      setLoading(false);
      return;
    }

    const cached = homeFeedCache.get(category);
    const isCacheFresh = Boolean(cached && Date.now() - cached.timestamp < CACHE_TTL_MS);

    if (cached) {
      setListings(cached.listings);
      setLoading(false);
      if (isCacheFresh) return;
    } else {
      setLoading(true);
    }

    setError(null);
    try {
      const finalList = category === 'all'
        ? await fetchAllActiveListings()
        : await fetchCategoryListings(category);
      homeFeedCache.set(category, { listings: finalList, timestamp: Date.now() });
      setListings(finalList);
    } catch (err: unknown) {
      console.error('HomePage fetch error:', err);
      const fallbackMsg = isSupabaseConfigured ? 'Impossible de charger les annonces' : 'Base de données non configurée';
      const message = err instanceof Error ? err.message : fallbackMsg;
      if (!cached) setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchListings(selectedCategory);
  }, [selectedCategory, fetchListings]);

  const mapToListingCard = useCallback((l: ListingData): ListingCardMapped => ({
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
  }), [cartQtyByListingId]);

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

  return {
    listings,
    loading,
    error,
    showLocationWarning,
    fetchListings,
    forYouRecommendations,
    mapToListingCard,
  };
}
