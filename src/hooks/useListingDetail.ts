import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { extractUuid, formatListingShareText, shareWithImage } from '../lib/utils';
import type { ListingFull, ReviewData, SimilarListing } from '../types/listing';

export function useListingDetail(id: string | undefined, userId: string | undefined) {
  const navigate = useNavigate();

  const [listing, setListing] = useState<ListingFull | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [similarListings, setSimilarListings] = useState<SimilarListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [markingSold, setMarkingSold] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  const fetchListing = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      let listingData: ListingFull | null = null;
      const targetUuid = extractUuid(id);
      const selectCols =
        '*, users!listings_user_id_fkey(id, full_name, avatar_url, phone, district, rating, pro_until, shop_name, shop_logo_url, created_at)';

      if (targetUuid) {
        const { data } = await supabase
          .from('listings')
          .select(selectCols)
          .eq('id', targetUuid)
          .maybeSingle();
        listingData = data as any;
      } else if (id) {
        // Match short 8-char ID or prefix (e.g. 26a59f9c)
        const cleanId = id.split('-').pop()?.slice(0, 8) || id.slice(0, 8);
        const { data: listings } = await supabase
          .from('listings')
          .select(selectCols)
          .neq('status', 'deleted')
          .order('created_at', { ascending: false })
          .limit(100);

        if (listings) {
          listingData = (listings.find((l: any) => l.id.startsWith(cleanId)) as any) || null;
        }
      }

      if (!listingData) {
        setNotFound(true);
        return;
      }

      setListing(listingData);

      if (userId) {
        const { data: favData } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', userId)
          .eq('listing_id', listingData.id)
          .maybeSingle();
        setIsFavorite(!!favData);
      }

      if (listingData.user_id) {
        const { data: revData } = await supabase
          .from('reviews')
          .select('*, reviewer:users!reviews_reviewer_id_fkey(full_name, avatar_url)')
          .eq('reviewed_id', listingData.user_id)
          .order('created_at', { ascending: false });

        if (revData) {
          setReviews(revData as any);
          const totalRating = revData.reduce((acc: number, r: any) => acc + r.rating, 0);
          setAvgRating(revData.length > 0 ? totalRating / revData.length : 0);
        }
      }

      if (listingData.category) {
        const { data: simData } = await supabase
          .from('listings')
          .select('*, users!listings_user_id_fkey(full_name, avatar_url)')
          .eq('status', 'active')
          .eq('category', listingData.category)
          .neq('id', listingData.id)
          .order('created_at', { ascending: false })
          .limit(4);

        if (simData) {
          setSimilarListings(
            simData.map((s: any) => {
              const sellerObj = Array.isArray(s.users) ? s.users[0] : s.users;
              return {
                id: s.id,
                title: s.title,
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
            })
          );
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(message);
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
