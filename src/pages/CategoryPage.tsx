import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Link, Navigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowUpDown, ChevronRight, PackageSearch } from 'lucide-react';

import { resolveCategorySlug } from '../lib/categoryCatalog';
import { useCategorySEO } from '../hooks/useCategorySEO';
import { useCategoryFacets } from '../hooks/useCategoryFacets';
import {
  useListingFeed,
  type ListingFeedRow,
  type ListingFeedSort,
} from '../hooks/useListingFeed';
import { useCart } from '../contexts/CartContext';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import ListingCard from '../components/listings/ListingCard';
import type { ListingCardData } from '../components/listings/ListingCard';
import ListingCardSkeleton from '../components/listings/ListingCardSkeleton';
import CategoryTree from '../components/category/CategoryTree';
import CategoryChipsBar from '../components/category/CategoryChipsBar';

/** Grille plus large qu'en recherche : 4 colonnes desktop, donc pages de 16. */
const PAGE_SIZE = 16;

const SORT_OPTIONS: { value: ListingFeedSort; label: string }[] = [
  { value: 'recent', label: 'Plus récent' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
];

const CategoryPage: React.FC = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Les routes SEO dédiées (/electronique, /mode…) n'ont pas de paramètre :
  // le slug est alors le premier segment du chemin.
  const slug = (categorySlug || location.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
  const category = resolveCategorySlug(slug);

  const selection = useMemo(
    () => ({
      condition: searchParams.get('condition') || '',
      district: searchParams.get('district') || '',
      priceMin: searchParams.get('priceMin') || '',
      priceMax: searchParams.get('priceMax') || '',
    }),
    [searchParams],
  );
  const sort = (searchParams.get('sort') as ListingFeedSort) || 'recent';

  useCategorySEO(category);

  const { facets } = useCategoryFacets(category?.id || '', selection);

  // Identité stable : le socle recalcule sa clé de cache sur cet objet.
  const feedFilters = useMemo(
    () => ({ category: category?.id || '', ...selection }),
    [category, selection],
  );

  const { listings, loading, loadingMore, error, totalCount, hasMore, loadMore, refetch } =
    useListingFeed({
      filters: feedFilters,
      sort,
      pageSize: PAGE_SIZE,
      boostLimit: 12,
      enabled: Boolean(category),
    });

  const { items: cartItems } = useCart();
  const cartQtyByListingId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cartItems) {
      map[item.listing_id] = (map[item.listing_id] || 0) + item.quantity;
    }
    return map;
  }, [cartItems]);

  const setParam = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const toggleParam = useCallback(
    (key: 'condition' | 'district', value: string) => {
      setParam({ [key]: selection[key] === value ? '' : value });
    },
    [selection, setParam],
  );

  const handleReset = useCallback(() => {
    setParam({ condition: '', district: '', priceMin: '', priceMax: '' });
  }, [setParam]);

  const activeFilterCount =
    (selection.condition ? 1 : 0) +
    (selection.district ? 1 : 0) +
    (selection.priceMin || selection.priceMax ? 1 : 0);

  // Défilement infini
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) loadMore();
      },
      { threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore]);

  if (!category) {
    return <Navigate to="/search" replace />;
  }

  const toCardData = (listing: ListingFeedRow): ListingCardData => ({
    id: listing.id,
    title: listing.title,
    price: listing.price,
    photos: listing.photos || [],
    created_at: listing.created_at,
    district: listing.district,
    condition: listing.condition,
    category: listing.category,
    boosted_until: listing.boosted_until,
    stock: listing.stock || 1,
    listing_user_id: listing.user_id,
    original_price: listing.original_price || null,
    variants: listing.variants || [],
    seller: {
      name: listing.users?.full_name || 'Anonyme',
      avatar: listing.users?.avatar_url || null,
    },
    is_favorite: false,
    cart_qty: cartQtyByListingId[listing.id] || 0,
  });

  const facetProps = {
    current: category,
    countByCategory: facets.countByCategory,
    conditions: facets.conditions,
    districts: facets.districts,
    selection,
    priceBounds: facets.priceBounds,
    activeFilterCount,
    onToggleCondition: (id: string) => toggleParam('condition', id),
    onToggleDistrict: (id: string) => toggleParam('district', id),
    onPriceCommit: (min: string, max: string) => setParam({ priceMin: min, priceMax: max }),
    onReset: handleReset,
  };

  return (
    <div className="min-h-screen bg-gray-50/70">
      {/* EN-TÊTE CATÉGORIE */}
      <header className="bg-gradient-to-br from-orange-500 to-amber-600 px-4 pt-4 pb-5 shadow-lg rounded-b-[32px] lg:rounded-none lg:px-6">
        <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-[11px] font-bold text-orange-100">
          <Link to="/" className="hover:text-white transition-colors">
            Accueil
          </Link>
          <ChevronRight className="h-3 w-3 opacity-70" />
          <span className="text-white">{category.short}</span>
        </nav>
        <h1 className="mt-1 text-xl lg:text-2xl font-extrabold tracking-tight text-white">
          {category.label}
        </h1>
        <p className="mt-0.5 text-[12.5px] font-semibold text-orange-50/90 max-w-2xl">
          {category.description}
        </p>
      </header>

      <div className="lg:flex lg:gap-6 lg:px-6 lg:pt-5">
        {/* ARBORESCENCE DESKTOP */}
        <div className="hidden lg:block lg:w-60 lg:flex-shrink-0">
          <CategoryTree {...facetProps} />
        </div>

        <div className="flex-1 min-w-0 py-4 lg:py-0">
          {/* BANDEAUX MOBILE */}
          <CategoryChipsBar {...facetProps} />

          <div className="px-4 lg:px-0 mt-3 lg:mt-0">
            {/* Compteur + tri */}
            <div className="flex items-center justify-between gap-3 mb-4 bg-white rounded-3xl px-4 py-3 shadow-lg shadow-gray-200/50 border border-gray-100">
              <p className="text-sm font-extrabold text-gray-900">
                {loading ? (
                  <span className="inline-block w-32 h-4 bg-gray-200 rounded animate-pulse" />
                ) : error ? null : (
                  <>
                    <span className="tabular-nums">{totalCount}</span>
                    {` annonce${totalCount !== 1 ? 's' : ''}`}
                    {activeFilterCount > 0 ? ' filtrées' : ''}
                  </>
                )}
              </p>
              <div className="flex items-center gap-1.5 rounded-2xl bg-gray-50 px-2.5 py-2">
                <ArrowUpDown className="h-4 w-4 text-[var(--color-on-surface-variant)]" />
                <select
                  aria-label="Trier les annonces"
                  value={sort}
                  onChange={(e) => setParam({ sort: e.target.value === 'recent' ? '' : e.target.value })}
                  className="text-xs font-bold bg-transparent border-none text-gray-700 cursor-pointer focus:outline-none max-w-[130px]"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <ListingCardSkeleton key={index} />
                ))}
              </div>
            )}

            {error && !loading && <ErrorState message={error} onRetry={refetch} />}

            {!loading && !error && listings.length === 0 && (
              <EmptyState
                icon={<PackageSearch className="w-16 h-16 opacity-40" />}
                title={
                  activeFilterCount > 0
                    ? 'Aucune annonce avec ces filtres'
                    : `Aucune annonce dans ${category.short}`
                }
                description={
                  activeFilterCount > 0
                    ? 'Élargissez la fourchette de prix ou retirez un filtre.'
                    : 'Cette catégorie se remplit petit à petit. Explorez les autres rayons en attendant.'
                }
                action={
                  activeFilterCount > 0
                    ? { label: 'Réinitialiser les filtres', onClick: handleReset }
                    : undefined
                }
              />
            )}

            {!loading && !error && listings.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {listings.map((listing, index) => (
                    <ListingCard key={listing.id} listing={toCardData(listing)} index={index} />
                  ))}
                </div>

                <div ref={loadMoreRef} className="py-8 flex justify-center">
                  {loadingMore && <LoadingSpinner size="md" />}
                  {!hasMore && (
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

      <div className="h-4 lg:hidden" />
    </div>
  );
};

export default CategoryPage;
