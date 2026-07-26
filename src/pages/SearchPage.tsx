import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  SlidersHorizontal,
  SearchX,
  ArrowUpDown,
} from 'lucide-react';


import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  getConditionLabel,
  getCategoryLabel,
  interleaveBoosted,
} from '../lib/utils';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { useCart } from '../context/CartContext';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import ListingCard from '../components/listings/ListingCard';
import ListingCardSkeleton from '../components/listings/ListingCardSkeleton';
import { SearchBar } from '../components/search/SearchBar';
import FilterSheet from '../components/search/FilterSheet';
import type { FilterValues } from '../components/search/FilterSheet';
import FilterPanel from '../components/search/FilterPanel';

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
}

const DEFAULT_FILTERS: FilterValues = {
  category: '',
  condition: '',
  district: '',
  priceMin: '',
  priceMax: '',
};

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

const SearchPage: React.FC<SearchPageProps> = ({ defaultCategory, categoryLabel }) => {
  usePageTitle(categoryLabel ? `${categoryLabel} à Daloa` : 'Recherche');

  const [searchParams] = useSearchParams();

  const initialQuery = searchParams.get('q') || '';
  const initialCategory = defaultCategory || searchParams.get('category') || '';

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<FilterValues>({ ...DEFAULT_FILTERS, category: initialCategory });
  const [sort, setSort] = useState<SortOption>('recent');

  const { items: cartItems } = useCart();
  const cartQtyByListingId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cartItems) {
      map[item.listing_id] = (map[item.listing_id] || 0) + item.quantity;
    }
    return map;
  }, [cartItems]);
  const [filterOpen, setFilterOpen] = useState(false);

  const [listings, setListings] = useState<ListingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const pageRef = useRef(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  // Debounce query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Build Supabase query
  const buildQuery = useCallback(() => {
    let q = supabase
      .from('listings')
      .select('*, users!listings_user_id_fkey(full_name, avatar_url)', { count: 'exact' })
      .eq('status', 'active');

    if (debouncedQuery.trim()) {
      q = q.textSearch(`fts`, debouncedQuery.trim(), { type: `websearch`, config: `french` });
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
  }, [debouncedQuery, filters, sort]);

  // Initial fetch
  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    pageRef.current = 0;
    try {
      // Create a local Set for this specific fetch execution to avoid concurrent race conditions
      const localFetchedIds = new Set<string>();
      // 1. Récupérer les annonces boostées actives qui correspondent aux filtres
      let bq = supabase
        .from('listings')
        .select('*, users!listings_user_id_fkey(full_name, avatar_url)')
        .eq('status', 'active')
        .gt('boosted_until', new Date().toISOString());

      if (debouncedQuery.trim()) bq = bq.textSearch('fts', debouncedQuery.trim(), { type: 'websearch', config: 'french' });
      if (filters.category) bq = bq.eq('category', filters.category);
      if (filters.condition) bq = bq.eq('condition', filters.condition);
      if (filters.district) bq = bq.eq('district', filters.district);
      if (filters.priceMin) bq = bq.gte('price', parseInt(filters.priceMin, 10));
      if (filters.priceMax) bq = bq.lte('price', parseInt(filters.priceMax, 10));
      
      bq = bq.order('boosted_until', { ascending: false }).limit(20);
      const { data: boostedData } = await bq;
      const boostedListings = (boostedData || []) as ListingData[];
      boostedListings.forEach(l => localFetchedIds.add(l.id));

      // 2. Récupérer la première page normale
      const q = buildQuery();
      const { data, error: fetchError, count } = await q.range(0, PAGE_SIZE - 1);

      if (fetchError) throw fetchError;

      const rawListings = (data || []) as ListingData[];
      const filteredRaw = rawListings.filter(l => !localFetchedIds.has(l.id));
      filteredRaw.forEach(l => localFetchedIds.add(l.id));

      const combined = [...boostedListings, ...filteredRaw];
      setListings(interleaveBoosted(combined));
      setTotalCount(count || 0);
      setHasMore((count || 0) > PAGE_SIZE);
      
      // Update the ref at the very end
      fetchedIdsRef.current = localFetchedIds;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(message);
      setListings([]);
      setTotalCount(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

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

      const rawListings = (data || []) as ListingData[];
      if (rawListings.length < PAGE_SIZE) {
        setHasMore(false);
      }
      const filteredRaw = rawListings.filter(l => !fetchedIdsRef.current.has(l.id));
      filteredRaw.forEach(l => fetchedIdsRef.current.add(l.id));

      const newInterleaved = interleaveBoosted(filteredRaw);
      setListings((prev) => [...prev, ...newInterleaved]);
      pageRef.current = nextPage;
    } catch (err: unknown) {
      console.error('Load more error:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [buildQuery, hasMore, loadingMore]);

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
    <motion.div
      className="min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* STICKY HEADER */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Rechercher un article..."
            />
          </div>
          <button
            onClick={() => setFilterOpen(true)}
            className="lg:hidden relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 active:scale-[0.97] transition-all"
            aria-label="Filtres"
          >
            <SlidersHorizontal className="h-5 w-5 text-gray-600" />
            {activeFilterChips.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterChips.length}
              </span>
            )}
          </button>
        </div>

        {/* Active filter chips */}
        {activeFilterChips.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
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
        <div className="flex-1 min-w-0 p-4">
          {/* Sort + count bar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              {loading ? (
                <span className="inline-block w-32 h-4 bg-gray-200 rounded animate-pulse" />
              ) : !error ? (
                `${totalCount} annonce${totalCount !== 1 ? 's' : ''} trouvee${totalCount !== 1 ? 's' : ''}`
              ) : null}
            </p>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-[var(--color-on-surface-variant)]" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="text-sm font-medium bg-transparent border-none text-[var(--color-on-surface)] cursor-pointer focus:outline-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

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

      {/* Spacer for bottom nav */}
      <div className="h-20" />
    </motion.div>
  );
};

export default SearchPage;