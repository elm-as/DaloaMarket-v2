import React, { useEffect, useState, useCallback } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn, formatDate, extractUuid, formatShopShareText, shareWithImage } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Avatar } from '../components/profile/Avatar';
import { ProBadge } from '../components/profile/ProBadge';
import { ListingCard } from '../components/listings/ListingCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Star,
  MapPin,
  MessageSquare,
  Calendar,
  Store,
  Package,
  Share2,
} from 'lucide-react';

interface SellerProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  district: string | null;
  rating: number | null;
  pro_until: string | null;
  created_at: string;
  shop_name: string | null;
  shop_description: string | null;
  shop_banner_url: string | null;
  shop_logo_url: string | null;
  shop_theme_color: string | null;
}

interface SellerListing {
  id: string;
  title: string;
  price: number;
  photos: string[];
  created_at: string;
  district: string;
  condition: string;
  category: string;
  boosted_until: string | null;
  status: string;
  user_id: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

import { useSEO } from '../hooks/useSEO';

const SellerProfilePage: React.FC = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const { user } = useSupabase();

  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const shopTitle = seller?.shop_name || seller?.full_name || 'Boutique';
  const isPro = seller?.pro_until ? new Date(seller.pro_until) > new Date() : false;

  const storeSchema = seller ? {
    '@context': 'https://schema.org',
    '@type': isPro ? 'Store' : 'LocalBusiness',
    'name': shopTitle,
    'description': seller.shop_description || `Boutique de ${seller.full_name || 'vendeur'} sur DaloaMarket à Daloa`,
    'url': `https://daloamarket.shop/seller/${seller.id}`,
    'image': seller.shop_logo_url || seller.shop_banner_url || seller.avatar_url || 'https://daloamarket.shop/web-app-manifest-512x512.png',
    'address': {
      '@type': 'PostalAddress',
      'addressLocality': 'Daloa',
      'addressRegion': 'Haut-Sassandra',
      'addressCountry': 'CI',
    },
    'aggregateRating': seller.rating ? {
      '@type': 'AggregateRating',
      'ratingValue': seller.rating,
      'reviewCount': reviews.length || 1,
    } : undefined,
  } : undefined;

  useSEO(`${shopTitle} — Boutique sur DaloaMarket`, {
    description: seller?.shop_description || `Découvrez les annonces et articles de la boutique ${shopTitle} sur DaloaMarket à Daloa (Côte d'Ivoire).`,
    keywords: `${shopTitle}, boutique Daloa, annonces ${shopTitle}, e-commerce Daloa, Côte d'Ivoire`,
    ogTitle: `${shopTitle} sur DaloaMarket`,
    ogDescription: seller?.shop_description || `Boutique officielle de ${shopTitle} à Daloa. Vente en ligne et de proximité.`,
    ogImage: seller?.shop_logo_url || seller?.shop_banner_url || seller?.avatar_url || undefined,
    canonical: seller ? `https://daloamarket.shop/seller/${seller.id}` : undefined,
    jsonLd: storeSchema,
  });

  const fetchSellerData = useCallback(async () => {
    if (!sellerId) return;

    setLoading(true);
    setError(null);

    try {
      let sellerData: SellerProfile | null = null;
      const targetUuid = extractUuid(sellerId);

      if (targetUuid) {
        const { data } = await supabase.from('users').select('*').eq('id', targetUuid).maybeSingle();
        sellerData = data as any;
      } else if (sellerId) {
        const { data: shopMatch } = await supabase.from('users').select('*').ilike('shop_name', sellerId).maybeSingle();
        if (shopMatch) {
          sellerData = shopMatch as any;
        } else {
          const { data: usersList } = await supabase.from('users').select('*').limit(100);
          if (usersList) {
            sellerData = (usersList.find((u: any) => u.id.startsWith(sellerId)) as any) || null;
          }
        }
      }

      if (!sellerData) throw new Error('Vendeur introuvable');
      setSeller(sellerData as unknown as SellerProfile);

      const targetUserId = sellerData.id;

      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (listingsError) throw listingsError;
      setListings(listingsData || []);

      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*, reviewer:users!reviews_reviewer_id_fkey(full_name, avatar_url)')
        .eq('reviewed_id', targetUserId)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;
      setReviews((reviewsData || []) as unknown as Review[]);

    } catch (err) {
      console.error('Error fetching seller data:', err);
      setError('Impossible de charger le profil du vendeur.');
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    fetchSellerData();
  }, [fetchSellerData]);

  const handleContact = () => {
    if (!user || !seller || listings.length === 0) return;
    const listingId = listings[0].id;
    navigate(`/messages/${listingId}/${seller.id}`);
  };



  const handleShareShop = async () => {
    if (!seller) return;
    const { title, text } = formatShopShareText(seller);
    const imageUrl = seller.shop_logo_url || seller.shop_banner_url || seller.avatar_url || null;
    const res = await shareWithImage(title, text, imageUrl);
    if (res.copied) {
      toast.success('Lien et texte de la boutique copiés ! (Faites Ctrl+V dans la légende si besoin)', { duration: 5000 });
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(
      () => toast.success('Lien de la boutique copié !'),
      () => toast.error('Impossible de copier le lien')
    );
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={cn(
          'w-4 h-4',
          i < Math.round(rating)
            ? 'text-amber-400 fill-amber-400'
            : 'text-gray-300'
        )}
      />
    ));
  };

  // Map listings to ListingCard format
  const listingCardData = listings.map((listing) => ({
    id: listing.id,
    title: listing.title,
    price: listing.price,
    photos: listing.photos || [],
    created_at: listing.created_at,
    district: listing.district,
    condition: listing.condition,
    category: listing.category,
    boosted_until: listing.boosted_until,
    seller: {
      name: seller?.full_name || 'Vendeur',
      avatar: seller?.avatar_url || null,
    },
    is_favorite: false,
    stock: (listing as any).stock || 1,
    listing_user_id: listing.user_id,
    original_price: (listing as any).original_price || null,
  }));

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="px-4 py-3">
          <Button
            variant="text"
            color="secondary"
            size="sm"
            icon={<ArrowLeft className="w-5 h-5" />}
            onClick={() => navigate(-1)}
          >
            Retour
          </Button>
        </div>

        <Card elevation={2} padding="lg" className="mx-4 rounded-2xl">
          <div className="flex flex-col items-center text-center">
            <Skeleton width="80px" height="80px" rounded="full" />
            <Skeleton width="160px" height="24px" className="mt-3" />
            <Skeleton width="100px" height="16px" className="mt-1" />
            <Skeleton width="200px" height="16px" className="mt-2" />
            <div className="flex gap-3 mt-4">
              <Skeleton width="120px" height="40px" rounded="md" />
              <Skeleton width="120px" height="40px" rounded="md" />
            </div>
          </div>
        </Card>

        <div className="px-4 mt-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height="200px" rounded="lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="px-4 py-3">
          <Button
            variant="text"
            color="secondary"
            size="sm"
            icon={<ArrowLeft className="w-5 h-5" />}
            onClick={() => navigate(-1)}
          >
            Retour
          </Button>
        </div>
        <ErrorState
          message={error || 'Vendeur introuvable.'}
          onRetry={fetchSellerData}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="px-4 py-3">
        <Button
          variant="text"
          color="secondary"
          size="sm"
          icon={<ArrowLeft className="w-5 h-5" />}
          onClick={() => navigate(-1)}
        >
          Retour
        </Button>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card elevation={3} padding="lg" className="mx-4 rounded-2xl relative overflow-hidden">
          {/* Shop Banner */}
          {seller.shop_banner_url && (
            <div className="absolute top-0 left-0 right-0 h-32">
              <img
                src={seller.shop_banner_url}
                alt="Shop banner"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30" />
            </div>
          )}

          {/* Thème color overlay if no banner */}
          {!seller.shop_banner_url && seller.shop_theme_color && (
            <div
              className="absolute top-0 left-0 right-0 h-32 opacity-20"
              style={{ backgroundColor: seller.shop_theme_color }}
            />
          )}

          {!seller.shop_banner_url && !seller.shop_theme_color && (
            <div
              className="absolute top-0 left-0 right-0 h-32 opacity-10"
              style={{ background: 'var(--gradient-primary)' }}
            />
          )}

          <div className="relative flex flex-col items-center text-center pt-20">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Avatar
                src={seller.shop_logo_url || seller.avatar_url}
                name={seller.shop_name || seller.full_name}
                size="xl"
                className="ring-4 ring-white shadow-lg"
                style={seller.shop_theme_color ? { borderColor: seller.shop_theme_color } : undefined}
              />
            </motion.div>

            {/* Shop Name */}
            {seller.shop_name ? (
              <div className="mt-4 flex items-center gap-2">
                <Store className="w-4 h-4 text-[var(--color-primary)]" />
                <h2 className="text-xl font-bold text-[var(--color-on-surface)]">
                  {seller.shop_name}
                </h2>
              </div>
            ) : (
              <h2 className="mt-4 text-xl font-bold text-[var(--color-on-surface)]">
                {seller.full_name || 'Vendeur'}
              </h2>
            )}

            {/* Shop Description */}
            {seller.shop_description && (
              <p className="mt-2 text-sm text-[var(--color-on-surface-variant)] max-w-md">
                {seller.shop_description}
              </p>
            )}

            {isPro && <ProBadge size="md" className="mt-1" />}

            {/* Rating */}
            {seller.rating != null && (
              <div className="flex items-center gap-1 mt-2">
                {renderStars(seller.rating)}
                <span className="text-sm text-[var(--color-on-surface-variant)] ml-1">
                  {seller.rating.toFixed(1)}
                </span>
              </div>
            )}

            {/* Member since */}
            <div className="flex items-center gap-1 mt-2 text-xs text-[var(--color-on-surface-variant)]">
              <Calendar className="w-3.5 h-3.5" />
              <span>Membre depuis {formatDate(seller.created_at)}</span>
            </div>

            {/* Contact info */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-sm text-[var(--color-on-surface-variant)]">
              {seller.district && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {seller.district}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4 w-full max-w-sm">
              {user && user.id !== sellerId && (
                <Button
                  variant="filled"
                  size="sm"
                  fullWidth={!isPro}
                  className="flex-1"
                  icon={<MessageSquare className="w-4 h-4" />}
                  onClick={handleContact}
                  style={seller.shop_theme_color ? { backgroundColor: seller.shop_theme_color } : undefined}
                >
                  Contacter
                </Button>
              )}

              {/* Bouton Partager réservé UNIQUEMENT aux vendeurs Pro */}
              {isPro && (
                <Button
                  variant="outlined"
                  color="primary"
                  size="sm"
                  fullWidth={!user || user.id === sellerId}
                  className="flex-1 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-50)]"
                  icon={<Share2 className="w-4 h-4" />}
                  onClick={handleShareShop}
                >
                  {user?.id === sellerId ? 'Partager ma boutique' : 'Partager la boutique'}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Active Listings */}
      <div className="mt-6">

        {listings.length === 0 ? (
          <div className="px-4">
            <EmptyState
              icon={<Package className="w-16 h-16 opacity-40" />}
              title="Ce vendeur n'a pas d'annonce active"
              description="Revenez plus tard pour decouvrir ses nouvelles annonces."
            />
          </div>
        ) : (
          <div className="px-4">
            <AnimatePresence>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {listingCardData.map((listing, index) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.05 }}
                  >
                    <ListingCard listing={listing} index={index} />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="mt-6">
        <SectionHeader title="Avis recus" />

        <div className="px-4">
          {reviews.length === 0 ? (
            <EmptyState
              icon={<Star className="w-16 h-16 opacity-40" />}
              title="Aucun avis reçu"
              description="Ce vendeur n'a pas encore d'avis."
            />
          ) : (
            <div className="space-y-3">
              {reviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                >
                  <Card elevation={1} padding="sm" className="rounded-2xl">
                    <div className="flex items-start gap-3">
                      <Avatar
                        src={review.reviewer?.avatar_url}
                        name={review.reviewer?.full_name}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900">
                            {review.reviewer?.full_name || 'Utilisateur'}
                          </p>
                          <span className="text-xs text-gray-400">
                            {formatDate(review.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 mt-1">
                          {renderStars(review.rating)}
                        </div>
                        {review.comment && (
                          <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerProfilePage;