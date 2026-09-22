import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { interleaveBoosted } from '../lib/utils';
import { rankFuzzySearchResults } from '../lib/smartSearchEngine';

/**
 * Chargement d'un flux d'annonces : filtres, tri, boostées, pagination.
 *
 * Socle commun à la recherche (`SearchPage`) et aux pages de rayon
 * (`CategoryPage`). Les deux pages divergent par leur intention et leur mise en
 * page, pas par leur accès aux données : garder deux chemins de requête faisait
 * dériver les règles de tri et de disponibilité de l'une à l'autre.
 *
 * La recherche texte est optionnelle. Sans `query`, tout le volet FTS / fuzzy
 * est court-circuité — une catégorie est une navigation, pas une requête.
 */

export interface ListingFeedRow {
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

export type ListingFeedSort = 'recent' | 'price_asc' | 'price_desc';

export interface ListingFeedFilters {
  category: string;
  condition: string;
  district: string;
  priceMin: string;
  priceMax: string;
}

export interface ListingFeedOptions {
  filters: ListingFeedFilters;
  sort: ListingFeedSort;
  /** Taille de page (12 en recherche, 16 en rayon : la grille y est plus large) */
  pageSize?: number;
  /** Recherche texte déjà debouncée. Absente sur une page catégorie. */
  query?: string;
  /** Requête FTS étendue (synonymes, correction) fournie par le moteur de recherche */
  ftsQueryString?: string;
  /** Nombre d'annonces boostées remontées avant la première page */
  boostLimit?: number;
  /** Suspend le chargement (slug inconnu, catégorie non résolue…) */
  enabled?: boolean;
}

const SELECT = '*, users!listings_user_id_fkey(full_name, avatar_url)';
const CACHE_TTL_MS = 2 * 60 * 1000;

interface FeedCacheEntry {
  listings: ListingFeedRow[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  fetchedIds: string[];
  timestamp: number;
}

// Cache mémoire partagé : un retour arrière depuis une fiche annonce doit
// retrouver la grille et sa position de pagination, pas la recharger.
const feedCache = new Map<string, FeedCacheEntry>();

function parsePrice(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function useListingFeed({
  filters,
  sort,
  pageSize = 12,
  query = '',
  ftsQueryString,
  boostLimit = 20,
  enabled = true,
}: ListingFeedOptions) {
  const trimmedQuery = query.trim();
  const hasTextSearch = trimmedQuery.length > 0;

  const cacheKey = useMemo(
    () => JSON.stringify({ q: trimmedQuery, f: filters, s: sort, p: pageSize }),
    [trimmedQuery, filters, sort, pageSize],
  );

  const cachedInitial = feedCache.get(cacheKey);

  const [listings, setListings] = useState<ListingFeedRow[]>(() => cachedInitial?.listings || []);
  const [loading, setLoading] = useState(() => enabled && !cachedInitial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(() => (cachedInitial ? cachedInitial.hasMore : true));
  const [totalCount, setTotalCount] = useState(() => (cachedInitial ? cachedInitial.totalCount : 0));

  const pageRef = useRef(cachedInitial ? cachedInitial.page : 0);
  const fetchedIdsRef = useRef<Set<string>>(new Set(cachedInitial ? cachedInitial.fetchedIds : []));

  /** Applique filtres et recherche à un builder Supabase. */
  const applyFilters = useCallback(
    (builder: any, withTextSearch: boolean) => {
      let next = builder.eq('status', 'active');

      if (withTextSearch && hasTextSearch) {
        next = next.textSearch('fts', ftsQueryString || trimmedQuery, {
          type: 'websearch',
          config: 'french',
        });
      }

      if (filters.category) next = next.eq('category', filters.category);
      if (filters.condition) next = next.eq('condition', filters.condition);
      if (filters.district) next = next.eq('district', filters.district);

      const min = parsePrice(filters.priceMin);
      const max = parsePrice(filters.priceMax);
      if (min !== null) next = next.gte('price', min);
      if (max !== null) next = next.lte('price', max);

      return next;
    },
    [filters, hasTextSearch, ftsQueryString, trimmedQuery],
  );

  const applySort = useCallback(
    (builder: any) => {
      switch (sort) {
        case 'price_asc':
          return builder.order('price', { ascending: true });
        case 'price_desc':
          return builder.order('price', { ascending: false });
        case 'recent':
        default:
          return builder.order('sort_at', { ascending: false });
      }
    },
    [sort],
  );

  const fetchFirstPage = useCallback(async () => {
    if (!enabled) {
      setListings([]);
      setTotalCount(0);
      setHasMore(false);
      setLoading(false);
      return;
    }

    const cached = feedCache.get(cacheKey);
    const isFresh = cached && Date.now() - cached.timestamp < CACHE_TTL_MS;

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
      const seen = new Set<string>();

      // 1. Annonces boostées encore actives, hors pagination
      const boostedQuery = applyFilters(supabase.from('listings').select(SELECT), true).gt(
        'boosted_until',
        new Date().toISOString(),
      );
      const { data: boostedData } = await boostedQuery
        .order('boosted_until', { ascending: false })
        .limit(boostLimit);

      const boosted = ((boostedData || []) as unknown as ListingFeedRow[]).filter((l) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      });

      // 2. Première page standard
      const baseQuery = applyFilters(
        supabase.from('listings').select(SELECT, { count: 'exact' }),
        true,
      );
      const { data, error: fetchError, count } = await applySort(baseQuery).range(0, pageSize - 1);
      if (fetchError) throw fetchError;

      let rows = (data || []) as unknown as ListingFeedRow[];
      let finalCount = count || 0;

      // 3. Repli fuzzy quand le FTS ne rend rien sur une recherche texte
      if (rows.length === 0 && trimmedQuery.length >= 2) {
        const fallbackQuery = applyFilters(supabase.from('listings').select(SELECT), false);
        const { data: allActive } = await fallbackQuery
          .order('sort_at', { ascending: false })
          .limit(100);

        if (allActive && allActive.length > 0) {
          const ranked = rankFuzzySearchResults(allActive as any[], trimmedQuery);
          if (ranked.length > 0) {
            rows = ranked.slice(0, pageSize) as unknown as ListingFeedRow[];
            finalCount = ranked.length;
          }
        }
      }

      const page = rows.filter((l) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      });

      let combined = [...boosted, ...page];

      // Classement strict par pertinence dès qu'il y a une recherche texte
      if (trimmedQuery.length >= 2) {
        combined = rankFuzzySearchResults(combined as any[], trimmedQuery) as ListingFeedRow[];
        finalCount = count ? count : combined.length;
      }

      const finalList = interleaveBoosted(combined);
      const newHasMore = finalCount > pageSize;

      setListings(finalList);
      setTotalCount(finalCount);
      setHasMore(newHasMore);
      fetchedIdsRef.current = seen;

      feedCache.set(cacheKey, {
        listings: finalList,
        totalCount: finalCount,
        hasMore: newHasMore,
        page: 0,
        fetchedIds: Array.from(seen),
        timestamp: Date.now(),
      });
    } catch (err: unknown) {
      // Une donnée en cache vaut mieux qu'un écran d'erreur : on ne dégrade
      // l'affichage que si la page n'a jamais rien pu montrer.
      if (!cached) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        setListings([]);
        setTotalCount(0);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  }, [applyFilters, applySort, boostLimit, cacheKey, enabled, pageSize, trimmedQuery]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !enabled) return;
    setLoadingMore(true);

    try {
      const nextPage = pageRef.current + 1;
      const from = nextPage * pageSize;
      const baseQuery = applyFilters(supabase.from('listings').select(SELECT), true);
      const { data, error: fetchError } = await applySort(baseQuery).range(from, from + pageSize - 1);
      if (fetchError) throw fetchError;

      const batch = (data || []) as unknown as ListingFeedRow[];
      let updatedHasMore = true;
      if (batch.length < pageSize) {
        updatedHasMore = false;
        setHasMore(false);
      }

      const fresh = batch.filter((l) => {
        if (fetchedIdsRef.current.has(l.id)) return false;
        fetchedIdsRef.current.add(l.id);
        return true;
      });

      setListings((prev) => {
        const nextListings = [...prev, ...interleaveBoosted(fresh)];
        feedCache.set(cacheKey, {
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
      console.error('Listing feed load more error:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [applyFilters, applySort, cacheKey, enabled, hasMore, loadingMore, pageSize, totalCount]);

  useEffect(() => {
    fetchFirstPage();
  }, [fetchFirstPage]);

  return {
    listings,
    loading,
    loadingMore,
    error,
    totalCount,
    hasMore,
    loadMore,
    refetch: fetchFirstPage,
  };
}
