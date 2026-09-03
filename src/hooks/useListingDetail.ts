import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { extractUuid, formatListingShareText, shareWithImage } from '../lib/utils';
import type { ListingFull, ReviewData, SimilarListing } from '../types/listing';
import { findSimilarListings } from '../lib/recommendationEngine';
import { userBehaviorService } from '../services/userBehaviorService';
import { incrementListingViews } from '../lib/analytics';

interface CachedListingDetail {
  listing: ListingFull;
  isFavorite: boolean;
  reviews: ReviewData[];
  avgRating: number;
  similarListings: SimilarListing[];
  timestamp: number;
}

const listingDetailCache = new Map<string, CachedListingDetail>();
const DETAIL_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export function useListingDetail(id: string | undefined, userId: string | undefined) {
  const navigate = useNavigate();

  const cached = id ? listingDetailCache.get(id) : undefined;

  const [listing, setListing] = useState<ListingFull | null>(() => cached?.listing || null);
  const [isFavorite, setIsFavorite] = useState(() => cached?.isFavorite || false);
  const [reviews, setReviews] = useState<ReviewData[]>(() => cached?.reviews || []);
  const [avgRating, setAvgRating] = useState(() => cached?.avgRating || 0);
  const [similarListings, setSimilarListings] = useState<SimilarListing[]>(() => cached?.similarListings || []);
  const [loading, setLoading] = useState(() => !cached);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [markingSold, setMarkingSold] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  const fetchListing = useCallback(async () => {
    if (!id) return;

    const cachedData = listingDetailCache.get(id);
    const isFresh = cachedData && (Date.now() - cachedData.timestamp < DETAIL_CACHE_TTL_MS);

    if (cachedData) {
      setListing(cachedData.listing);
      setIsFavorite(cachedData.isFavorite);
      setReviews(cachedData.reviews);
      setAvgRating(cachedData.avgRating);
      setSimilarListings(cachedData.similarListings);
      setLoading(false);
      if (isFresh) return;
    } else {
      setLoading(true);
    }

    setError(null);
    setNotFound(false);

    try {
      let listingData: ListingFull | null = null;
      const targetUuid = extractUuid(id);
      const selectCols =
        '*, users!listings_user_id_fkey(id, full_name, avatar_url, phone, rating, pro_until, created_at, shop_name, shop_logo_url)';

      if (targetUuid) {
        const { data, error: fetchErr } = await supabase
          .from('listings')
          .select(selectCols)
          .eq('id', targetUuid)
          .maybeSingle();

        if (fetchErr) {
          if (!cachedData) setError(fetchErr.message);
          return;
        }

        if (data) {
          const rawUser = data.users as any;
          const userObj = Array.isArray(rawUser) ? rawUser[0] : rawUser;

          listingData = {
            id: data.id,
            title: data.title,
            description: data.description,
            price: data.price,
            photos: data.photos || [],
            created_at: data.created_at,
            district: data.district,
            condition: data.condition,
            category: data.category,
            boosted_until: data.boosted_until,
            status: data.status,
            user_id: data.user_id,
            users: userObj || null,
            accepts_delivery: (data as any).accepts_delivery ?? true,
            delivery_fee_override: (data as any).delivery_fee_override ?? null,
            stock: (data as any).stock ?? 1,
            original_price: (data as any).original_price ?? null,
            variants: Array.isArray((data as any).variants) ? (data as any).variants : [],
          };
        }
      } else if (id) {
        // Résolution par préfixe court (ex: /l/c14e460e ou /l/titre-c14e460e)
        const cleanPrefix = (id.split('-').pop() || id).toLowerCase().replace(/[^a-f0-9]/g, '');

        if (cleanPrefix && cleanPrefix.length >= 4) {
          const minRaw = cleanPrefix.padEnd(32, '0');
          const maxRaw = cleanPrefix.padEnd(32, 'f');
          const minUuid = `${minRaw.slice(0, 8)}-${minRaw.slice(8, 12)}-${minRaw.slice(12, 16)}-${minRaw.slice(16, 20)}-${minRaw.slice(20, 32)}`;
          const maxUuid = `${maxRaw.slice(0, 8)}-${maxRaw.slice(8, 12)}-${maxRaw.slice(12, 16)}-${maxRaw.slice(16, 20)}-${maxRaw.slice(20, 32)}`;

          // 1. Recherche par intervalle UUID natif (Index B-Tree direct, ultra-rapide, 100% compatible sans dépendance RPC)
          const { data: rangeData, error: rangeErr } = await supabase
            .from('listings')
            .select(selectCols)
            .gte('id', minUuid)
            .lte('id', maxUuid)
            .neq('status', 'deleted')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let resolvedData = rangeData;

          // 2. Fallback par RPC si l'intervalle n'a rien renvoyé
          if (!resolvedData) {
            try {
              const { data: rpcListings } = await (supabase.rpc as any)(
                'get_listing_by_short_id',
                { p_id: cleanPrefix }
              );
              const rpcItems = (rpcListings as any[]) || [];
              if (rpcItems.length > 0) {
                const foundId = rpcItems[0].id;
                const { data: fullRpcData } = await supabase
                  .from('listings')
                  .select(selectCols)
                  .eq('id', foundId)
                  .maybeSingle();
                resolvedData = fullRpcData;
              }
            } catch (e) {
              console.warn('[ListingDetail] RPC fallback failed:', e);
            }
          }

          if (resolvedData) {
            const rawUser = resolvedData.users as any;
            const userObj = Array.isArray(rawUser) ? rawUser[0] : rawUser;

            listingData = {
              id: resolvedData.id,
              title: resolvedData.title,
              description: resolvedData.description,
              price: resolvedData.price,
              photos: resolvedData.photos || [],
              created_at: resolvedData.created_at,
              district: resolvedData.district,
              condition: resolvedData.condition,
              category: resolvedData.category,
              boosted_until: resolvedData.boosted_until,
              status: resolvedData.status,
              user_id: resolvedData.user_id,
              users: userObj || null,
              accepts_delivery: (resolvedData as any).accepts_delivery ?? true,
              delivery_fee_override: (resolvedData as any).delivery_fee_override ?? null,
              stock: (resolvedData as any).stock ?? 1,
              original_price: (resolvedData as any).original_price ?? null,
              variants: Array.isArray((resolvedData as any).variants) ? (resolvedData as any).variants : [],
            };
          }
        }
      }

      if (!listingData) {
        if (!cachedData) setNotFound(true);
        return;
      }

      setListing(listingData);

      // Apprentissage comportemental : Enregistrer l'interaction de vue
      userBehaviorService.trackInteraction({
        type: 'view',
        listingId: listingData.id,
        category: listingData.category,
        price: listingData.price,
        title: listingData.title,
        district: listingData.district,
      });

      // Incrémentation des vues réelles dans Supabase (view_count)
      void incrementListingViews(listingData.id, userId);

      // Récupération des favoris, avis et des candidats pour le moteur ML de similarité
      const [favRes, revRes, simCandidatesRes] = await Promise.all([
        userId
          ? supabase
              .from('favorites')
              .select('id')
              .eq('user_id', userId)
              .eq('listing_id', listingData.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        listingData.user_id
          ? supabase
              .from('reviews')
              .select('*, reviewer:users!reviews_reviewer_id_fkey(full_name, avatar_url)')
              .eq('reviewed_id', listingData.user_id)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: null }),
        supabase
          .from('listings')
          .select('*, users!listings_user_id_fkey(full_name, avatar_url)')
          .eq('status', 'active')
          .eq('category', listingData.category)
          .neq('id', listingData.id)
          .order('created_at', { ascending: false })
          .limit(40),
      ]);

      const finalIsFav = !!favRes?.data;
      setIsFavorite(finalIsFav);

      let finalReviews: ReviewData[] = [];
      let finalAvgRating = 0;
      if (revRes?.data) {
        finalReviews = revRes.data as any;
        const totalRating = finalReviews.reduce((acc: number, r: any) => acc + r.rating, 0);
        finalAvgRating = finalReviews.length > 0 ? totalRating / finalReviews.length : 0;
        setReviews(finalReviews);
        setAvgRating(finalAvgRating);
      }

      let finalSimilar: SimilarListing[] = [];
      if (simCandidatesRes?.data && simCandidatesRes.data.length > 0) {
        const rawCandidates = simCandidatesRes.data.map((s: any) => {
          const sellerObj = Array.isArray(s.users) ? s.users[0] : s.users;
          return {
            id: s.id,
            title: s.title,
            description: s.description || '',
            price: s.price,
            photos: s.photos || [],
            created_at: s.created_at,
            district: s.district,
            condition: s.condition,
            category: s.category,
            boosted_until: s.boosted_until,
            seller: {
              name: sellerObj?.full_name || 'Anonyme',
              avatar: sellerObj?.avatar_url || null,
            },
            is_favorite: false,
            stock: s.stock || 1,
            listing_user_id: s.user_id,
            original_price: s.original_price || null,
            variants: Array.isArray(s.variants) ? s.variants : [],
          };
        });

        // Exécution de l'algorithme Machine Learning multi-critères
        const scoredSimilar = findSimilarListings(listingData, rawCandidates, {
          limit: 4,
          minScore: 28,
        });

        finalSimilar = scoredSimilar.map((scored) => ({
          ...scored.item,
          similarityPercent: scored.similarityPercent,
          matchReason: scored.matchReason,
        }));

        setSimilarListings(finalSimilar);
      }

      // Save to in-memory cache
      listingDetailCache.set(id, {
        listing: listingData,
        isFavorite: finalIsFav,
        reviews: finalReviews,
        avgRating: finalAvgRating,
        similarListings: finalSimilar,
        timestamp: Date.now(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue';
      if (!cachedData) {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  const handleShare = useCallback(async () => {
    if (!listing) return;
    const { title, text } = formatListingShareText(listing);
    const imageUrl = listing.photos && listing.photos.length > 0 ? listing.photos[0] : null;
    const res = await shareWithImage(title, text, imageUrl);
    if (res.copied) {
      toast.success('Légende et lien copiés ! (Faites Ctrl+V dans la légende WhatsApp si besoin)', { duration: 5000 });
    }
  }, [listing]);

  const handleMarkSold = useCallback(async () => {
    if (!listing) return;
    setMarkingSold(true);
    try {
      const { error: updateError } = await supabase.rpc('mark_listing_as_sold', {
        p_listing_id: listing.id,
      });
      if (updateError) throw updateError;
      setListing((prev) => (prev ? { ...prev, status: 'sold' } : null));
      toast.success('Annonce marquée comme vendue');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setMarkingSold(false);
    }
  }, [listing]);

  const handleDelete = useCallback(async () => {
    if (!listing) return;
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.rpc('delete_listing_secure', {
        p_listing_id: listing.id,
      });
      if (deleteError) throw deleteError;
      toast.success('Annonce supprimée');
      navigate('/');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  }, [listing, navigate]);

  const handleReportSubmit = useCallback(
    async (reason: string) => {
      if (!userId || !listing) {
        toast.error('Veuillez vous connecter pour signaler une annonce.');
        return false;
      }
      if (!reason.trim()) {
        toast.error('Veuillez indiquer un motif de signalement.');
        return false;
      }
      setSubmittingReport(true);
      try {
        const { error: insertError } = await supabase.from('reports').insert({
          listing_id: listing.id,
          reporter_id: userId,
          reported_user_id: listing.user_id || null,
          reason: reason.trim(),
        });
        if (insertError) throw insertError;
        toast.success('Signalement envoyé. Merci.');
        return true;
      } catch {
        toast.error('Erreur lors du signalement.');
        return false;
      } finally {
        setSubmittingReport(false);
      }
    },
    [userId, listing]
  );

  return {
    listing,
    isFavorite,
    reviews,
    avgRating,
    similarListings,
    loading,
    error,
    notFound,
    fetchListing,
    handleShare,
    handleMarkSold,
    markingSold,
    handleDelete,
    deleting,
    handleReportSubmit,
    submittingReport,
  };
}
