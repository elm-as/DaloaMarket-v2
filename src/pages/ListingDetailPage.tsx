import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Flag,
  Pencil,
  MapPin,
  Calendar,
  Zap,
  ImageOff,
  Star,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Store,
  Share2,
  ShieldCheck,
  Truck,
  Maximize2,
  X,
  PhoneCall,
  CheckCircle2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { useSEO } from '../hooks/useSEO';
import { formatPrice, formatDate, extractUuid, formatListingShareText, shareWithImage } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Modal } from '../components/ui/Modal';
import ListingCard from '../components/listings/ListingCard';
import { ConditionBadge } from '../components/listings/ConditionBadge';
import DiscountBadge from '../components/listings/DiscountBadge';
import FavoriteButton from '../components/listings/FavoriteButton';
import Avatar from '../components/profile/Avatar';
import ProBadge from '../components/profile/ProBadge';
import ReviewForm from '../components/listings/ReviewForm';
import { AddToCartSection } from '../components/listings/AddToCartSection';
import type { ListingFull, ReviewData, SimilarListing } from '../types/listing';

const ListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSupabase();

  const [listing, setListing] = useState<ListingFull | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [similarListings, setSimilarListings] = useState<SimilarListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Image gallery state
  const [currentImage, setCurrentImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Preload all listing images for instant switching
  useEffect(() => {
    if (listing?.photos && listing.photos.length > 0) {
      listing.photos.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    }
  }, [listing?.photos]);

  // Description toggle
  const [descExpanded, setDescExpanded] = useState(false);

  // Modals
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [markingSold, setMarkingSold] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const productSchema = listing ? {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": listing.title,
    "image": listing.photos && listing.photos.length > 0 ? listing.photos : ["https://daloamarket.shop/web-app-manifest-512x512.png"],
    "description": listing.description,
    "sku": listing.id,
    "offers": {
      "@type": "Offer",
      "url": `https://daloamarket.shop/listings/${listing.id}`,
      "priceCurrency": "XOF",
      "price": listing.price,
      "itemCondition": listing.condition === 'new' ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
      "availability": listing.status === 'active' && listing.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Person",
        "name": listing.users?.full_name || "Vendeur DaloaMarket"
      }
    }
  } : undefined;

  useSEO(listing?.title || 'Détails de l\'annonce', {
    description: listing 
      ? `${listing.description.slice(0, 150)}... Achetez à Daloa (Quartier/Zone: ${listing.district}) pour ${listing.price} FCFA sur DaloaMarket.`
      : "Détails de l'annonce sur DaloaMarket",
    keywords: listing 
      ? `${listing.title}, acheter ${listing.title}, ${listing.category}, Daloa, Côte d'Ivoire`
      : "petites annonces, Daloa",
    ogImage: listing?.photos && listing.photos.length > 0 ? listing.photos[0] : undefined,
    canonical: listing ? `https://daloamarket.shop/listings/${listing.id}` : undefined,
    jsonLd: productSchema,
  });

  const isOwner = user?.id === listing?.user_id;
  const isPro = listing?.users?.pro_until && new Date(listing.users.pro_until) > new Date();
  const isSold = listing?.status === 'sold';

  // ---- Fetch listing ----
  const fetchListing = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      let listingData: ListingFull | null = null;
      const targetUuid = extractUuid(id);

      if (targetUuid) {
        const { data } = await supabase
          .from('listings')
          .select('*, users!listings_user_id_fkey(id, full_name, avatar_url, phone, district, rating, pro_until, shop_name, shop_logo_url, created_at)')
          .eq('id', targetUuid)
          .maybeSingle();
        listingData = data as any;
      } else if (id) {
        // Match short 8-char ID or prefix (e.g. 26a59f9c)
        const cleanId = id.split('-').pop()?.slice(0, 8) || id.slice(0, 8);
        const { data: listings } = await supabase
          .from('listings')
          .select('*, users!listings_user_id_fkey(id, full_name, avatar_url, phone, district, rating, pro_until, shop_name, shop_logo_url, created_at)')
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

      const data = listingData;
      setListing(data);

      // Check favorite
      if (user) {
        const { data: favData } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('listing_id', data.id)
          .maybeSingle();
        setIsFavorite(!!favData);
      }

      // Fetch reviews for seller
      if (data?.user_id) {
        const { data: revData } = await supabase
          .from('reviews')
          .select('*, reviewer:users!reviews_reviewer_id_fkey(full_name, avatar_url)')
          .eq('reviewed_id', data.user_id)
          .order('created_at', { ascending: false });

        if (revData) {
          setReviews(revData as any);
          const totalRating = revData.reduce((acc: number, r: any) => acc + r.rating, 0);
          setAvgRating(revData.length > 0 ? totalRating / revData.length : 0);
        }
      }

      // Fetch similar listings
      if (data?.category) {
        const { data: simData } = await supabase
          .from('listings')
          .select('*, users!listings_user_id_fkey(full_name, avatar_url)')
          .eq('status', 'active')
          .eq('category', data.category)
          .neq('id', data.id)
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
  }, [id, user]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  // Image navigation
  const images = listing?.photos?.length ? listing.photos : [];
  const nextImage = () => {
    if (images.length) setCurrentImage((prev) => (prev + 1) % images.length);
  };
  const prevImage = () => {
    if (images.length) setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleShare = async () => {
    if (!listing) return;
    const { title, text } = formatListingShareText(listing);
    const imageUrl = listing.photos && listing.photos.length > 0 ? listing.photos[0] : null;
    const res = await shareWithImage(title, text, imageUrl);
    if (res.copied) {
      toast.success('Légende et lien copiés ! (Faites Ctrl+V dans la légende WhatsApp si besoin)', { duration: 5000 });
    }
  };

  const handleMarkSold = async () => {
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
  };

  const handleDelete = async () => {
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
      setDeleteConfirmOpen(false);
    }
  };

  const handleReport = () => {
    if (!user) {
      navigate('/login', { state: { from: `/l/${id}` } });
      return;
    }
    setReportOpen(true);
  };

  const handleReportSubmit = async () => {
    if (!user || !listing) {
      toast.error('Veuillez vous connecter pour signaler une annonce.');
      return;
    }
    if (!reportReason.trim()) {
      toast.error('Veuillez indiquer un motif de signalement.');
      return;
    }
    setSubmittingReport(true);
    try {
      const { error: insertError } = await supabase.from('reports').insert({
        listing_id: listing.id,
        reporter_id: user.id,
        reported_user_id: listing?.user_id || null,
        reason: reportReason.trim(),
      });
      if (insertError) throw insertError;
      toast.success('Signalement envoyé. Merci.');
      setReportReason('');
      setReportOpen(false);
    } catch {
      toast.error('Erreur lors du signalement.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const timeAgo = listing
    ? formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale: fr })
    : '';

  const isBoosted = listing?.boosted_until && new Date(listing.boosted_until) > new Date();
  const memberSince = listing?.users?.created_at ? formatDate(listing.users.created_at) : '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorState message="Annonce introuvable ou supprimée." />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorState message={error || 'Une erreur est survenue'} onRetry={fetchListing} />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gray-50 pb-28 relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* SOLD OVERLAY */}
      {isSold && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-white text-5xl font-black tracking-widest mb-2 uppercase drop-shadow-lg">
              VENDU
            </div>
            <p className="text-gray-300 text-sm">Cette annonce n'est plus disponible sur le marché</p>
          </div>
        </div>
      )}

      {/* HERO IMAGE CAROUSEL WITH OVERLAY ACTION BUTTONS */}
      <div className="relative w-full aspect-[4/3] md:aspect-[16/9] max-h-[460px] bg-gray-900 overflow-hidden group">
        {/* TOP FLOATING BAR (INSIDE IMAGE CONTAINER) */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
          <button
            onClick={() => navigate(-1)}
            className="pointer-events-auto w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center shadow-lg hover:bg-black/70 active:scale-95 transition-all"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center shadow-lg hover:bg-black/70 active:scale-95 transition-all"
              aria-label="Partager"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <FavoriteButton listingId={listing.id} isFavorited={isFavorite} />
            {isOwner && (
              <button
                onClick={() => navigate(`/create-listing?id=${listing.id}`)}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center shadow-lg hover:bg-black/70 active:scale-95 transition-all"
                aria-label="Modifier"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setReportOpen(true)}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center shadow-lg hover:bg-black/70 active:scale-95 transition-all"
              aria-label="Signaler"
            >
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>

        {images.length > 0 ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center">
                <LoadingSpinner size="md" className="text-white/60" />
              </div>
            )}
            <motion.img
              key={currentImage}
              src={images[currentImage]}
              alt={`${listing.title} - Photo ${currentImage + 1}`}
              decoding="async"
              onLoad={() => setImageLoading(false)}
              className={`w-full h-full object-cover cursor-pointer transition-opacity duration-300 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onClick={() => setLightboxOpen(true)}
              initial={{ opacity: 0.7, scale: 1.02 }}
              animate={{ opacity: imageLoading ? 0 : 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            />

            {/* Expand / Lightbox Trigger */}
            <button
              onClick={() => setLightboxOpen(true)}
              className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-md text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Plein écran
            </button>

            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 active:scale-95 transition-all"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 active:scale-95 transition-all"
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>

                {/* Pagination Dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === currentImage ? 'w-5 bg-[#FF7F00]' : 'w-2 bg-white/60'
                      }`}
                      aria-label={`Photo ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-800">
            <ImageOff className="h-12 w-12 opacity-30 mb-2" />
            <span className="text-xs font-medium">Aucune photo disponible</span>
          </div>
        )}
      </div>

      {/* THUMBNAIL BAR */}
      {images.length > 1 && (
        <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentImage(idx)}
              className={`relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                idx === currentImage ? 'border-[#FF7F00] ring-2 ring-orange-500/20 scale-105' : 'border-transparent opacity-70'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        {/* PRICE & TITLE CARD */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl font-black bg-gradient-to-r from-[#FF7F00] to-orange-600 bg-clip-text text-transparent">
                  {formatPrice(listing.price)}
                </span>
                {listing.original_price != null && listing.original_price > listing.price && (
                  <span className="text-sm text-gray-400 line-through">
                    {formatPrice(listing.original_price)}
                  </span>
                )}
              </div>
            </div>

            {listing.original_price != null && listing.original_price > listing.price && (
              <DiscountBadge originalPrice={listing.original_price} currentPrice={listing.price} size="lg" />
            )}
          </div>

          <h1 className="text-lg font-bold text-gray-900 leading-tight">
            {listing.title}
          </h1>

          {/* CHIPS */}
          <div className="flex flex-wrap gap-2 pt-1">
            <ConditionBadge condition={listing.condition} />
            <Chip icon={<MapPin className="h-3.5 w-3.5" />} size="sm">
              {listing.district}
            </Chip>
            <Chip icon={<Calendar className="h-3.5 w-3.5" />} size="sm">
              {timeAgo}
            </Chip>
            {isBoosted && (
              <Chip icon={<Zap className="h-3.5 w-3.5" />} size="sm" color="warning" selected>
                Sponsorisé
              </Chip>
            )}
          </div>

          {/* DESCRIPTION */}
          <div className="pt-2 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {descExpanded || listing.description.length <= 250
                ? listing.description
                : `${listing.description.slice(0, 250)}...`}
            </p>
            {listing.description.length > 250 && (
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="text-xs font-bold text-[#FF7F00] mt-2 hover:underline"
              >
                {descExpanded ? 'Réduire' : 'Afficher toute la description'}
              </button>
            )}
          </div>
        </div>

        {/* TRUST BADGES CARD */}
        <div className="bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-yellow-500/5 rounded-2xl p-4 border border-orange-500/15 flex items-center justify-around gap-2 text-center">
          <div className="flex flex-col items-center">
            <ShieldCheck className="w-6 h-6 text-[#FF7F00] mb-1" />
            <span className="text-[11px] font-bold text-gray-900">Paiement Sécurisé</span>
            <span className="text-[10px] text-gray-500">Protection Escrow</span>
          </div>
          <div className="h-8 w-px bg-orange-200/50" />
          <div className="flex flex-col items-center">
            <Truck className="w-6 h-6 text-[#FF7F00] mb-1" />
            <span className="text-[11px] font-bold text-gray-900">Livraison Daloa</span>
            <span className="text-[10px] text-gray-500">Par DaloaDelivery</span>
          </div>
        </div>

        {/* SELLER CARD */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
          <Link
            to={`/profile/seller/${listing.user_id}`}
            className="flex items-center gap-4 no-underline group"
          >
            <div className="relative flex-shrink-0">
              <div className="rounded-full p-[3px] bg-gradient-to-br from-[#FF7F00] to-amber-500 shadow-md">
                <div className="rounded-full overflow-hidden bg-white p-[2px]">
                  <Avatar
                    src={isPro && listing.users?.shop_logo_url ? listing.users.shop_logo_url : listing.users?.avatar_url}
                    name={isPro && listing.users?.shop_name ? listing.users.shop_name : listing.users?.full_name}
                    size="lg"
                  />
                </div>
              </div>
              {isPro && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#FF7F00] flex items-center justify-center shadow-sm">
                  <Store className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-gray-900 truncate group-hover:text-[#FF7F00] transition-colors">
                  {isPro && listing.users?.shop_name ? listing.users.shop_name : (listing.users?.full_name || 'Vendeur Daloa')}
                </span>
                {isPro && <ProBadge size="sm" />}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3.5 w-3.5 ${
                      star <= Math.round(listing.users?.rating || avgRating)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-gray-200 fill-gray-200'
                    }`}
                  />
                ))}
                <span className="text-xs text-gray-500 font-semibold ml-1">
                  {(listing.users?.review_count || reviews.length) > 0
                    ? `${listing.users?.review_count || reviews.length} avis`
                    : 'Nouveau vendeur'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Membre depuis {memberSince || 'récemment'}</p>
            </div>

            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-orange-50 group-hover:text-[#FF7F00] transition-colors">
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Quick Seller Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            {listing.user_id !== user?.id && (
              <Button
                variant="outlined"
                color="secondary"
                size="sm"
                fullWidth
                icon={<MessageCircle className="h-4 w-4" />}
                onClick={() => {
                  if (!user) {
                    navigate('/login', { state: { from: `/listings/${id}` } });
                    return;
                  }
                  navigate(`/messages/${id}/${listing.user_id}`);
                }}
              >
                Envoyer un message
              </Button>
            )}

            <Link to={`/profile/seller/${listing.user_id}`} className="w-full">
              <Button variant="tonal" color="primary" size="sm" fullWidth>
                Voir la boutique
              </Button>
            </Link>
          </div>
        </div>

        {/* REVIEWS SECTION */}
        <SectionHeader title="Avis des acheteurs" />
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
          {reviews.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                <div className="text-center">
                  <div className="text-3xl font-black text-amber-500 leading-none">
                    {avgRating.toFixed(1)}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 font-bold">SUR 5</p>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= Math.round(avgRating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-200 fill-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 font-medium">
                    {reviews.length} évaluation{reviews.length > 1 ? 's' : ''} vérifiée{reviews.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar src={review.reviewer.avatar_url} name={review.reviewer.full_name} size="sm" />
                        <span className="text-xs font-bold text-gray-900">{review.reviewer.full_name}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{formatDate(review.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                    {review.comment && <p className="text-xs text-gray-600 leading-relaxed">{review.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="Aucun avis pour le moment" description="Soyez le premier à donner votre avis après votre achat." />
          )}

          {user && !isOwner && (
            <div className="pt-3 border-t border-gray-100">
              <ReviewForm listingId={listing.id} sellerId={listing.user_id} onSubmitted={fetchListing} />
            </div>
          )}
        </div>

        {/* SIMILAR LISTINGS */}
        {similarListings.length > 0 && (
          <div className="space-y-3 pt-2">
            <SectionHeader title="Annonces similaires à Daloa" />
            <div className="grid grid-cols-2 gap-3">
              {similarListings.map((sim) => (
                <ListingCard key={sim.id} listing={sim} />
              ))}
            </div>
          </div>
        )}

        {/* OWNER CONTROLS */}
        {isOwner && !isSold && (
          <div className="bg-white rounded-3xl p-5 border border-orange-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Gestion de votre annonce</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button variant="filled" color="primary" size="md" loading={markingSold} onClick={handleMarkSold}>
                Marquer comme vendu
              </Button>
              <Button variant="outlined" color="secondary" size="md" onClick={() => navigate(`/create-listing?id=${listing.id}`)}>
                Modifier
              </Button>
            </div>
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="text-xs font-semibold text-red-500 hover:underline w-full text-center block pt-1"
            >
              Supprimer définitivement l'annonce
            </button>
          </div>
        )}
      </div>

      {/* ─── STICKY BOTTOM ACTIONS BAR ─── */}
      {!isSold && listing.user_id !== user?.id && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 p-3.5 z-40 shadow-2xl"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)' }}
        >
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            <AddToCartSection listing={listing} />
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      <AnimatePresence>
        {lightboxOpen && images.length > 0 && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <img
              src={images[currentImage]}
              alt={listing.title}
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
            />

            <div className="flex items-center gap-4 mt-4">
              {images.length > 1 && (
                <>
                  <button onClick={prevImage} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <span className="text-white text-sm font-semibold">
                    {currentImage + 1} / {images.length}
                  </span>
                  <button onClick={nextImage} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20">
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REPORT MODAL */}
      <Modal
        isOpen={reportOpen}
        onClose={() => {
          setReportOpen(false);
          setReportReason('');
        }}
        title="Signaler cette annonce"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Aidez-nous à garder DaloaMarket sûr. Indiquez la raison du signalement. Pour tout autre problème ou besoin d'assistance, contactez directement l'<Link to="/help" className="text-primary hover:underline font-bold">Aide & Support</Link>.
          </p>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Ex: Contenu inapproprié, fausse annonce..."
            className="w-full min-h-[100px] p-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7F00]"
          />
          <div className="flex gap-2">
            <Button variant="outlined" color="secondary" size="md" fullWidth onClick={() => setReportOpen(false)}>
              Annuler
            </Button>
            <Button variant="filled" color="error" size="md" fullWidth disabled={!reportReason.trim()} loading={submittingReport} onClick={handleReport}>
              Signaler
            </Button>
          </div>
        </div>
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Supprimer l'annonce ?">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Cette action est définitive et supprimera l'annonce.</p>
          <div className="flex gap-2">
            <Button variant="outlined" color="secondary" size="md" fullWidth onClick={() => setDeleteConfirmOpen(false)}>
              Annuler
            </Button>
            <Button variant="filled" color="error" size="md" fullWidth loading={deleting} onClick={handleDelete}>
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default ListingDetailPage;
