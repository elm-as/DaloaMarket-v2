import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  SlidersHorizontal,
  SearchX,
  ArrowUpDown,
} from 'lucide-react';


import { supabase } from '../lib/supabase';
import { useSEO } from '../hooks/useSEO';
import {
  getConditionLabel,
  getCategoryLabel,
  interleaveBoosted,
  cn,
} from '../lib/utils';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { useCart } from '../contexts/CartContext';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import ListingCard from '../components/listings/ListingCard';
import ListingCardSkeleton from '../components/listings/ListingCardSkeleton';
import { SearchBar } from '../components/search/SearchBar';
import FilterSheet from '../components/search/FilterSheet';
import type { FilterValues } from '../components/search/FilterSheet';
import FilterPanel from '../components/search/FilterPanel';
import type { ListingFull } from '../types/listing';
import { userBehaviorService } from '../services/userBehaviorService';
import { expandSmartSearch, rankFuzzySearchResults, type SmartSearchExpansion } from '../lib/smartSearchEngine';
import { Sparkles } from 'lucide-react';

const DEFAULT_FILTERS: FilterValues = {
  category: '',
  condition: '',
  district: '',
  priceMin: '',
  priceMax: '',
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
  user_id: string;
  stock: number;
  users?: { full_name: string; avatar_url: string | null } | null;
  original_price?: number | null;
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
  seller: { name: string; avatar: string | null };
  is_favorite: boolean;
  cart_qty?: number;
  stock: number;
  listing_user_id: string;
  original_price: number | null;
  variants?: { id: string; label: string; price: number | null; stock: number; active?: boolean }[];
}

type SortOption = 'recent' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Plus recent' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix decroissant' },
];

const PAGE_SIZE = 12;

interface SearchPageProps {
  defaultCategory?: string;
  categoryLabel?: string;
}

interface SearchCacheEntry {
  listings: ListingData[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  fetchedIds: string[];
  timestamp: number;
}

// In-memory cache for search results & pagination state
const searchCache = new Map<string, SearchCacheEntry>();
const SEARCH_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

const SearchPage: React.FC<SearchPageProps> = ({ defaultCategory, categoryLabel }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlQuery = searchParams.get('q') || '';
  const urlCategory = defaultCategory || searchParams.get('category') || '';
  const urlCondition = searchParams.get('condition') || '';
  const urlDistrict = searchParams.get('district') || '';
  const urlPriceMin = searchParams.get('priceMin') || '';
  const urlPriceMax = searchParams.get('priceMax') || '';
  const urlSort = (searchParams.get('sort') as SortOption) || 'recent';

  const pageTitleText = categoryLabel 
    ? `${categoryLabel} à Daloa` 
    : urlQuery 
      ? `Recherche "${urlQuery}" à Daloa` 
      : 'Rechercher des annonces à Daloa';

  const pageDescText = urlQuery
    ? `Résultats de recherche pour "${urlQuery}" sur DaloaMarket à Daloa (Côte d'Ivoire). Trouve les meilleures annonces locales.`
    : categoryLabel
      ? `Consultez les meilleures annonces pour ${categoryLabel} à Daloa.`
      : 'Recherchez parmi des milliers d\'annonces de produits, véhicules, téléphones et mode à Daloa.';

  useSEO(pageTitleText, {
    description: pageDescText,
    keywords: `recherche DaloaMarket, annonces Daloa, ${urlQuery}, ${categoryLabel || 'marketplace Daloa'}`,
    canonical: 'https://daloamarket.com/search',
  });

  const [query, setQuery] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery);
  const [filters, setFilters] = useState<FilterValues>({
    category: urlCategory,
    condition: urlCondition,
    district: urlDistrict,
    priceMin: urlPriceMin,
    priceMax: urlPriceMax,
  });
  const [sort, setSort] = useState<SortOption>(urlSort);

  // Synchronisation lors de la navigation retour/avant du navigateur
  useEffect(() => {
    const currentQ = searchParams.get('q') || '';
    setQuery(currentQ);
    setDebouncedQuery(currentQ);
    setFilters({
      category: defaultCategory || searchParams.get('category') || '',
      condition: searchParams.get('condition') || '',
      district: searchParams.get('district') || '',
      priceMin: searchParams.get('priceMin') || '',
      priceMax: searchParams.get('priceMax') || '',
    });
    setSort((searchParams.get('sort') as SortOption) || 'recent');
  }, [searchParams, defaultCategory]);

  const { items: cartItems } = useCart();
  const cartQtyByListingId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cartItems) {
      map[item.listing_id] = (map[item.listing_id] || 0) + item.quantity;
    }
    return map;
  }, [cartItems]);
  const [filterOpen, setFilterOpen] = useState(false);

  // Debounce query (300ms) et mise à jour de l'URL pour persistance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      if (query.trim().length >= 2) {
        userBehaviorService.trackSearch(query.trim());
      }

      // Mettre à jour l'URL sans recharger la page
      const nextParams = new URLSearchParams();
      if (query.trim()) nextParams.set('q', query.trim());
      if (filters.category) nextParams.set('category', filters.category);
      if (filters.condition) nextParams.set('condition', filters.condition);
      if (filters.district) nextParams.set('district', filters.district);
      if (filters.priceMin) nextParams.set('priceMin', filters.priceMin);
      if (filters.priceMax) nextParams.set('priceMax', filters.priceMax);
      if (sort !== 'recent') nextParams.set('sort', sort);

      setSearchParams(nextParams, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, filters, sort, setSearchParams]);

  // Expansion sémantique & Tolérance aux fautes (Fuzzy Search)
  const searchExpansion = useMemo(() => {
    return expandSmartSearch(debouncedQuery);
  }, [debouncedQuery]);

  // Compute cache key based on search parameters
  const currentCacheKey = useMemo(() => {
    return JSON.stringify({ q: debouncedQuery.trim(), f: filters, s: sort });
  }, [debouncedQuery, filters, sort]);

  const cachedInitial = searchCache.get(currentCacheKey);

  const [listings, setListings] = useState<ListingData[]>(() => cachedInitial?.listings || []);
  const [loading, setLoading] = useState(() => !cachedInitial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(() => cachedInitial ? cachedInitial.hasMore : true);
  const [totalCount, setTotalCount] = useState(() => cachedInitial ? cachedInitial.totalCount : 0);

  const pageRef = useRef(cachedInitial ? cachedInitial.page : 0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const fetchedIdsRef = useRef<Set<string>>(new Set(cachedInitial ? cachedInitial.fetchedIds : []));

  // Build Supabase query avec FTS étendu
  const buildQuery = useCallback(() => {
    let q = supabase
      .from('listings')
      .select('*, users!listings_user_id_fkey(full_name, avatar_url)', { count: 'exact' })
      .eq('status', 'active');

    if (debouncedQuery.trim()) {
      const ftsTerm = searchExpansion.ftsQueryString || debouncedQuery.trim();
      q = q.textSearch(`fts`, ftsTerm, { type: `websearch`, config: `french` });
    }

    if (filters.category) {
      q = q.eq('category', filters.category);
    }
    if (filters.condition) {
      q = q.eq('condition', filters.condition);
    }
    if (filters.district) {
      q = q.eq('district', filters.district);
    }
    if (filters.priceMin) {
      q = q.gte('price', parseInt(filters.priceMin, 10));
    }
    if (filters.priceMax) {
      q = q.lte('price', parseInt(filters.priceMax, 10));
    }

    switch (sort) {
      case 'price_asc':
        q = q.order('price', { ascending: true });
        break;
      case 'price_desc':
        q = q.order('price', { ascending: false });
        break;
      case 'recent':
      default:
        q = q.order('created_at', { ascending: false });
        break;
    }

    return q;
  }, [debouncedQuery, searchExpansion, filters, sort]);

  // Initial fetch with cache checking & smart fuzzy fallback
  const fetchListings = useCallback(async () => {
    const cacheKey = JSON.stringify({ q: debouncedQuery.trim(), f: filters, s: sort });
    const cached = searchCache.get(cacheKey);
    const isFresh = cached && (Date.now() - cached.timestamp < SEARCH_CACHE_TTL_MS);

    if (cached) {
      setListings(cached.listings);
      setTotalCount(cached.totalCount);
      setHasMore(cached.hasMore);
      pageRef.current = cached.page;
      fetchedIdsRef.current = new Set(cached.fetchedIds);
      setLoading(false);
      if (isFresh) return;
    } else {
      setLoading(true);
    }

    setError(null);
    pageRef.current = 0;
    try {
      const localFetchedIds = new Set<string>();
      
      // 1. Récupérer les annonces boostées actives
      let bq = supabase
        .from('listings')
        .select('*, users!listings_user_id_fkey(full_name, avatar_url)')
        .eq('status', 'active')
        .gt('boosted_until', new Date().toISOString());

      if (debouncedQuery.trim()) {
        const ftsTerm = searchExpansion.ftsQueryString || debouncedQuery.trim();
        bq = bq.textSearch('fts', ftsTerm, { type: 'websearch', config: 'french' });
      }
      if (filters.category) bq = bq.eq('category', filters.category);
      if (filters.condition) bq = bq.eq('condition', filters.condition);
      if (filters.district) bq = bq.eq('district', filters.district);
      if (filters.priceMin) bq = bq.gte('price', parseInt(filters.priceMin, 10));
      if (filters.priceMax) bq = bq.lte('price', parseInt(filters.priceMax, 10));
      
      bq = bq.order('boosted_until', { ascending: false }).limit(20);
      const { data: boostedData } = await bq;
      const boostedListings = (boostedData || []) as unknown as ListingData[];
      boostedListings.forEach(l => localFetchedIds.add(l.id));

      // 2. Récupérer la première page normale
      const q = buildQuery();
      const { data, error: fetchError, count } = await q.range(0, PAGE_SIZE - 1);

      if (fetchError) throw fetchError;

      let rawListings = (data || []) as unknown as ListingData[];
      let finalCount = count || 0;

      // 3. Fallback Fuzzy Search si FTS n'a renvoyé aucun résultat
      if (rawListings.length === 0 && debouncedQuery.trim().length >= 2) {
        let fallbackQuery = supabase
          .from('listings')
          .select('*, users!listings_user_id_fkey(full_name, avatar_url)')
          .eq('status', 'active');

        if (filters.category) fallbackQuery = fallbackQuery.eq('category', filters.category);
        if (filters.condition) fallbackQuery = fallbackQuery.eq('condition', filters.condition);
        if (filters.district) fallbackQuery = fallbackQuery.eq('district', filters.district);
        if (filters.priceMin) fallbackQuery = fallbackQuery.gte('price', parseInt(filters.priceMin, 10));
        if (filters.priceMax) fallbackQuery = fallbackQuery.lte('price', parseInt(filters.priceMax, 10));

        const { data: allActive } = await fallbackQuery.order('created_at', { ascending: false }).limit(100);

        if (allActive && allActive.length > 0) {
          const ranked = rankFuzzySearchResults(allActive as any[], debouncedQuery.trim());
          if (ranked.length > 0) {
            rawListings = ranked.slice(0, PAGE_SIZE) as unknown as ListingData[];
            finalCount = ranked.length;
          }
        }
      }

      const filteredRaw = rawListings.filter(l => !localFetchedIds.has(l.id));
      filteredRaw.forEach(l => localFetchedIds.add(l.id));

      let combined = [...boostedListings, ...filteredRaw];

      // Filtrage et classement strict par pertinence lors d'une recherche textuelle
      if (debouncedQuery.trim().length >= 2) {
        combined = rankFuzzySearchResults(combined as any[], debouncedQuery.trim()) as ListingData[];
        finalCount = (count !== undefined && count !== null && count > 0) ? count : combined.length;
      }

      const finalList = interleaveBoosted(combined);
      const newHasMore = finalCount > PAGE_SIZE;

      setListings(finalList);
      setTotalCount(finalCount);
      setHasMore(newHasMore);
      
      fetchedIdsRef.current = localFetchedIds;

      searchCache.set(cacheKey, {
        listings: finalList,
        totalCount: finalCount,
        hasMore: newHasMore,
        page: 0,
        fetchedIds: Array.from(localFetchedIds),
        timestamp: Date.now(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue';
      if (!cached) {
        setError(message);
        setListings([]);
        setTotalCount(0);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  }, [buildQuery, debouncedQuery, searchExpansion, filters, sort]);

  // Load more (infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const from = nextPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const q = buildQuery();
      const { data, error: fetchError } = await q.range(from, to);

      if (fetchError) throw fetchError;

      const rawListings = (data || []) as unknown as ListingData[];
      let updatedHasMore: boolean = true;
      if (rawListings.length < PAGE_SIZE) {
        updatedHasMore = false;
        setHasMore(false);
      }
      const filteredRaw = rawListings.filter(l => !fetchedIdsRef.current.has(l.id));
      filteredRaw.forEach(l => fetchedIdsRef.current.add(l.id));

      const newInterleaved = interleaveBoosted(filteredRaw);
      setListings((prev) => {
        const nextListings = [...prev, ...newInterleaved];
        // Update cache with extended pagination list
        const cacheKey = JSON.stringify({ q: debouncedQuery.trim(), f: filters, s: sort });
        searchCache.set(cacheKey, {
          listings: nextListings,
          totalCount,
          hasMore: updatedHasMore,
          page: nextPage,
          fetchedIds: Array.from(fetchedIdsRef.current),
          timestamp: Date.now(),
        });
        return nextListings;
      });
      pageRef.current = nextPage;
    } catch (err: unknown) {
      console.error('Load more error:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [buildQuery, debouncedQuery, filters, hasMore, loadingMore, sort, totalCount]);

  // Refetch on filter/query change
  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // IntersectionObserver
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }
    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, loading, loadingMore, loadMore]);

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

  const handleApplyFilters = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  const removeFilter = (key: keyof FilterValues) => {
    setFilters((prev) => ({ ...prev, [key]: '' }));
  };

  const activeFilterChips: { key: string; label: string }[] = [];
  if (filters.category) {
    activeFilterChips.push({ key: 'category', label: getCategoryLabel(filters.category) });
  }
  if (filters.condition) {
    activeFilterChips.push({ key: 'condition', label: getConditionLabel(filters.condition) });
  }
  if (filters.district) {
    activeFilterChips.push({ key: 'district', label: filters.district });
  }

  return (
    <div className="min-h-screen bg-gray-50/70">
      {/* STICKY HEADER */}
      <div className="sticky top-0 z-30 bg-gradient-to-br from-orange-500 to-amber-600 px-4 pt-4 pb-5 shadow-lg rounded-b-[32px]">
        <div className="mb-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-100">Explorer Daloa</p>
          <h1 className="text-xl font-extrabold tracking-tight text-white">Que recherchez-vous ?</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex-1">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Rechercher un article..."
            />
          </div>
          <button
            onClick={() => setFilterOpen(true)}
            className={cn(
              'lg:hidden relative flex items-center gap-1.5 min-h-[48px] px-3.5 rounded-2xl font-extrabold text-[13px] active:scale-[0.96] transition-all',
              activeFilterChips.length > 0
                ? 'bg-gray-900 text-white shadow-lg'
                : 'bg-white text-orange-600 border border-white/70 shadow-lg hover:bg-orange-50'
            )}
            aria-label="Filtres"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filtres</span>
            {activeFilterChips.length > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-white/25 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterChips.length}
              </span>
            )}
          </button>
        </div>

        {/* Active filter chips */}
        {activeFilterChips.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-0.5">
            {activeFilterChips.map((chip) => (
              <Chip
                key={chip.key}
                selected
                color="primary"
                size="sm"
                onDelete={() => removeFilter(chip.key as keyof FilterValues)}
              >
                {chip.label}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {/* MOBILE FILTER SHEET */}
      <FilterSheet
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={handleApplyFilters}
      />

      {/* CONTENT AREA */}
      <div className="w-full max-w-2xl lg:max-w-none mx-auto lg:px-6">
      <div className="lg:flex lg:gap-6 lg:px-6">
        {/* DESKTOP FILTER PANEL */}
        <div className="hidden lg:block lg:w-60 lg:flex-shrink-0 lg:pt-4">
          <FilterPanel filters={filters} onApply={handleApplyFilters} />
        </div>

        {/* RESULTS */}
        <div className="flex-1 min-w-0 px-4 py-5">
          {/* Sort + count bar */}
          <div className="flex items-center justify-between mb-5 bg-white rounded-3xl px-4 py-3 shadow-lg shadow-gray-200/50 border border-gray-100">
            <p className="text-sm font-extrabold text-gray-900">
              {loading ? (
                <span className="inline-block w-32 h-4 bg-gray-200 rounded animate-pulse" />
              ) : !error ? (
                `${totalCount} annonce${totalCount !== 1 ? 's' : ''} trouvee${totalCount !== 1 ? 's' : ''}`
              ) : null}
            </p>
            <div className="flex items-center gap-1.5 rounded-2xl bg-gray-50 px-2.5 py-2">
              <ArrowUpDown className="h-4 w-4 text-[var(--color-on-surface-variant)]" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="text-xs font-bold bg-transparent border-none text-gray-700 cursor-pointer focus:outline-none max-w-[120px]"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Smart Typo & Synonym Correction Notice */}
          {searchExpansion.isCorrected && debouncedQuery && !loading && (
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-orange-50/90 border border-orange-200/70 rounded-2xl text-xs text-gray-800 mb-4 shadow-2xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
                <span>
                  Résultats pour <strong className="text-gray-900 font-extrabold">{searchExpansion.correctedQuery}</strong>
                  <span className="text-gray-500 ml-1.5">(recherché : <em>"{searchExpansion.originalQuery}"</em>)</span>
                </span>
              </div>
              {searchExpansion.expandedTerms.length > 1 && (
                <span className="text-[10px] bg-white px-2 py-0.5 rounded-lg text-orange-700 font-bold border border-orange-100 hidden sm:inline">
                  Synonymes inclus
                </span>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <ErrorState
              message={error}
              onRetry={fetchListings}
            />
          )}

          {/* Empty */}
          {!loading && !error && listings.length === 0 && (
            <EmptyState
              icon={<SearchX className="w-16 h-16 opacity-40" />}
              title="Aucun résultat"
              description="Essayez d'autres filtres ou termes de recherche."
            />
          )}

          {/* Results grid */}
          {!loading && !error && listings.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                {listings.map((listing, index) => (
                  <ListingCard
                    key={listing.id}
                    listing={mapToListingCard(listing)}
                    index={index}
                  />
                ))}
              </div>

              {/* Infinite scroll trigger */}
              <div ref={loadMoreRef} className="py-8 flex justify-center">
                {loadingMore && <LoadingSpinner size="md" />}
                {!hasMore && listings.length > 0 && (
                  <p className="text-sm font-medium text-[var(--color-on-surface-variant)]">
                    Fin des résultats
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      </div>

      {/* Petit espace de respiration (le padding bottom de la nav est géré par AppLayout) */}
      <div className="h-4 lg:hidden" />
    </div>
  );
};

export default SearchPage;