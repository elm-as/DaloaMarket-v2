import React, { useEffect, useState, useCallback } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { cn, formatDate, extractUuid, formatShopShareText, shareWithImage } from '../lib/utils';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Avatar } from '../components/profile/Avatar';
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
  ShieldCheck,
  Truck,
  Info,
  CheckCircle2,
  HandCoins,
} from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { affiliatedDeliverersService, type SellerDeliverySettings } from '../services/affiliatedDeliverersService';

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
  variants?: { id: string; label: string; price: number | null; stock: number; active?: boolean }[];
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

type TabType = 'listings' | 'reviews' | 'about';

const SellerProfilePage: React.FC = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const { user } = useSupabase();

  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<SellerDeliverySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('listings');

  const shopTitle = seller?.shop_name || seller?.full_name || 'Boutique';
  const isPro = seller?.pro_until ? new Date(seller.pro_until) > new Date() : false;
  const themeColor = seller?.shop_theme_color || '#FF7F00';

  const storeSchema = seller
    ? {
        '@context': 'https://schema.org',
        '@type': isPro ? 'Store' : 'LocalBusiness',
        name: shopTitle,
        description:
          seller.shop_description ||
          `Boutique de ${seller.full_name || 'vendeur'} sur DaloaMarket à Daloa`,
        url: `https://daloamarket.com/seller/${seller.id}`,
        image:
          seller.shop_logo_url ||
          seller.shop_banner_url ||
          seller.avatar_url ||
          'https://daloamarket.com/web-app-manifest-512x512.png',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Daloa',
          addressRegion: 'Haut-Sassandra',
          addressCountry: 'CI',
        },
        aggregateRating: seller.rating
          ? {
              '@type': 'AggregateRating',
              ratingValue: seller.rating,
              reviewCount: reviews.length || 1,
            }
          : undefined,
      }
    : undefined;

  useSEO(`${shopTitle} — Boutique sur DaloaMarket`, {
    description:
      seller?.shop_description ||
      `Découvrez les annonces et articles de la boutique ${shopTitle} sur DaloaMarket à Daloa (Côte d'Ivoire).`,
    keywords: `${shopTitle}, boutique Daloa, annonces ${shopTitle}, e-commerce Daloa, Côte d'Ivoire`,
    ogTitle: `${shopTitle} sur DaloaMarket`,
    ogDescription:
      seller?.shop_description ||
      `Boutique officielle de ${shopTitle} à Daloa. Vente en ligne et de proximité.`,
    ogImage: seller?.shop_logo_url || seller?.shop_banner_url || seller?.avatar_url || undefined,
    canonical: seller ? `https://daloamarket.com/seller/${seller.id}` : undefined,
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
        const { data: shopMatch } = await supabase
          .from('users')
          .select('*')
          .ilike('shop_name', sellerId)
          .maybeSingle();
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

      // Fetch delivery settings (Cash on delivery, etc.)
      try {
        const delivSettings = await affiliatedDeliverersService.getSellerDeliverySettings(targetUserId);
        setDeliverySettings(delivSettings);
      } catch (e) {
        console.warn('Could not fetch delivery settings:', e);
      }

      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (listingsError) throw listingsError;
      setListings((listingsData || []) as unknown as SellerListing[]);

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
    if (!seller) return;
    if (!user) {
      navigate('/login');
      return;
    }
    const listingId = listings[0]?.id || 'contact';
    navigate(`/messages/${listingId}/${seller.id}`);
  };

  const handleShareShop = async () => {
    if (!seller) return;
    const { title, text } = formatShopShareText(seller);
    const imageUrl = seller.shop_logo_url || seller.shop_banner_url || seller.avatar_url || null;
    const res = await shareWithImage(title, text, imageUrl);
    if (res.copied) {
      toast.success('Lien et texte de la boutique copiés ! (Faites Coller pour partager)', {
        duration: 4000,
      });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={cn(
          'w-3.5 h-3.5',
          i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
        )}
      />
    ));
  };

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
    variants: listing.variants || [],
  }));

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 pt-6 space-y-4">
        <Skeleton height="180px" rounded="lg" className="rounded-3xl" />
        <Skeleton height="140px" rounded="lg" className="rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height="220px" rounded="lg" className="rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 pt-12">
        <ErrorState message={error || 'Vendeur introuvable.'} onRetry={fetchSellerData} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70 pb-32">
      {/* ── 1. IMMERSIVE HERO BANNER ── */}
      <div className="relative w-full h-44 sm:h-56 md:h-64 overflow-hidden bg-gray-900">
        {seller.shop_banner_url ? (
          <img
            src={seller.shop_banner_url}
            alt="Bannière"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full opacity-90 transition-colors"
            style={{
              background: `linear-gradient(135deg, ${themeColor}, ${themeColor}bb, #111827)`,
            }}
          />
        )}
        {/* Soft dark gradient vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40" />

        {/* Floating Top Bar (Back & Share) */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between max-w-5xl mx-auto">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl bg-black/40 backdrop-blur-md text-white border border-white/20 flex items-center justify-center active:scale-95 transition-all shadow-md hover:bg-black/60"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleShareShop}
            className="w-10 h-10 rounded-2xl bg-black/40 backdrop-blur-md text-white border border-white/20 flex items-center justify-center active:scale-95 transition-all shadow-md hover:bg-black/60"
            title="Partager la vitrine"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 2. SELLER IDENTITY OVERLAPPING CARD ── */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 -mt-13 sm:-mt-15">
        {/* Floating Full Unclipped Avatar (102px Sweet Spot) */}
        <div className="relative flex justify-center z-20">
          <div
            className="rounded-full p-1 bg-white ring-4 ring-white shadow-2xl transition-transform hover:scale-105 shrink-0"
            style={{
              width: '102px',
              height: '102px',
              border: `3px solid ${themeColor}`,
              boxShadow: `0 10px 28px -4px ${themeColor}50`,
            }}
          >
            {seller.shop_logo_url || seller.avatar_url ? (
              <img
                src={seller.shop_logo_url || seller.avatar_url || ''}
                alt={shopTitle}
                className="w-full h-full rounded-full object-cover bg-gray-50"
              />
            ) : (
              <div
                className="w-full h-full rounded-full flex items-center justify-center text-white font-black text-2xl uppercase"
                style={{ backgroundColor: themeColor }}
              >
                {shopTitle.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* White Card Container */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-5 sm:p-7 pt-4 -mt-12 sm:-mt-13 relative">
          {/* Subtle Ambient Brand Glow */}
          <div
            className="absolute top-0 left-8 right-8 h-1 rounded-b-full opacity-90 pointer-events-none"
            style={{ background: `linear-gradient(90deg, transparent, ${themeColor}, transparent)` }}
          />
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{ background: `radial-gradient(circle at 50% 0%, ${themeColor}10, transparent 65%)` }}
          />

          {/* Seller Information */}
          <div className="text-center relative z-10 pt-8 sm:pt-9 space-y-3">
            {/* Title + Badges in ONE unified line */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                {shopTitle}
              </h1>
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: themeColor }} />
              {isPro && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black text-amber-900 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 border border-amber-300 shadow-2xs">
                  <Star className="w-2.5 h-2.5 fill-amber-900" />
                  PRO
                </span>
              )}
            </div>

            {/* Clean Inline Meta Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              {seller.district && (
                <span
                  className="inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-xl border shadow-2xs"
                  style={{
                    backgroundColor: `${themeColor}0f`,
                    borderColor: `${themeColor}30`,
                    color: themeColor,
                  }}
                >
                  <MapPin className="w-3.5 h-3.5" style={{ color: themeColor }} />
                  {seller.district}
                </span>
              )}
              {deliverySettings?.cash_on_delivery_enabled && (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/70 shadow-2xs">
                  <HandCoins className="w-3.5 h-3.5 text-emerald-600" />
                  Paiement à la livraison
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-gray-400 font-medium px-2 py-1 bg-gray-50 rounded-xl border border-gray-100">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                Depuis {formatDate(seller.created_at)}
              </span>
            </div>

            {/* Description Quote (Clean, centered and compact) */}
            {seller.shop_description && (
              <div className="max-w-md mx-auto pt-0.5">
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed bg-gray-50/80 px-4 py-2.5 rounded-2xl border border-gray-100/90 italic text-center">
                  "{seller.shop_description}"
                </p>
              </div>
            )}

            {/* CTA Buttons Row (Balanced & Proportional) */}
            <div className="flex items-center justify-center gap-2.5 pt-1 max-w-sm mx-auto">
              {user && user.id !== seller.id ? (
                <>
                  <button
                    type="button"
                    onClick={handleContact}
                    className="flex-1 h-10 sm:h-11 px-5 rounded-2xl text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
                    style={{
                      backgroundColor: themeColor,
                      boxShadow: `0 6px 16px -3px ${themeColor}45`,
                    }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Contacter</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareShop}
                    className="h-10 sm:h-11 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all bg-white border text-gray-700 hover:bg-gray-50 shadow-2xs"
                    style={{ borderColor: `${themeColor}40` }}
                    title="Partager la boutique"
                  >
                    <Share2 className="w-4 h-4" style={{ color: themeColor }} />
                    <span>Partager</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleShareShop}
                    className="flex-1 h-10 sm:h-11 px-5 rounded-2xl text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
                    style={{
                      backgroundColor: themeColor,
                      boxShadow: `0 6px 16px -3px ${themeColor}45`,
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Partager ma boutique</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/settings')}
                    className="h-10 sm:h-11 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 shadow-2xs"
                  >
                    <Store className="w-4 h-4 text-gray-500" />
                    <span>Gérer</span>
                  </button>
                </>
              )}
            </div>

            {/* 3 Compact KPI Stats Strip */}
            <div className="grid grid-cols-3 max-w-sm mx-auto mt-3 py-2 px-2.5 bg-gray-50/90 rounded-2xl border border-gray-100 divide-x divide-gray-200/70 text-center shadow-2xs">
              <div className="px-1">
                <span className="block text-sm font-black leading-tight" style={{ color: themeColor }}>
                  {listings.length}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Articles</span>
              </div>
              <div className="px-1">
                <span className="block text-sm font-black text-amber-700 leading-tight">
                  {seller.rating ? `${seller.rating.toFixed(1)} ★` : 'Nouveau'}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{reviews.length} Avis</span>
              </div>
              <div className="px-1">
                <span className="block text-sm font-black text-emerald-700 leading-tight">
                  {deliverySettings?.cash_on_delivery_enabled ? 'COD Activé' : 'Sur place'}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Paiement</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. MODERN SEGMENT TABS ── */}
        <div className="mt-5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-1">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setActiveTab('listings')}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-black transition-all rounded-xl select-none',
                activeTab === 'listings' ? 'font-black' : 'text-gray-400 hover:text-gray-700'
              )}
              style={activeTab === 'listings' ? { color: themeColor, backgroundColor: `${themeColor}12` } : {}}
            >
              <Package className="w-4 h-4" />
              <span>Articles ({listings.length})</span>
              {activeTab === 'listings' && (
                <motion.div
                  layoutId="activeSellerTab"
                  className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                  style={{ backgroundColor: themeColor }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-black transition-all rounded-xl select-none',
                activeTab === 'reviews' ? 'font-black' : 'text-gray-400 hover:text-gray-700'
              )}
              style={activeTab === 'reviews' ? { color: themeColor, backgroundColor: `${themeColor}12` } : {}}
            >
              <Star className="w-4 h-4" />
              <span>Avis clients ({reviews.length})</span>
              {activeTab === 'reviews' && (
                <motion.div
                  layoutId="activeSellerTab"
                  className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                  style={{ backgroundColor: themeColor }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-black transition-all rounded-xl select-none',
                activeTab === 'about' ? 'font-black' : 'text-gray-400 hover:text-gray-700'
              )}
              style={activeTab === 'about' ? { color: themeColor, backgroundColor: `${themeColor}12` } : {}}
            >
              <Info className="w-4 h-4" />
              <span>Garanties</span>
              {activeTab === 'about' && (
                <motion.div
                  layoutId="activeSellerTab"
                  className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                  style={{ backgroundColor: themeColor }}
                />
              )}
            </button>
          </div>
        </div>

        {/* ── 4. TAB CONTENT ── */}
        <div className="mt-4">
          {activeTab === 'listings' && (
            <div>
              {listings.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center space-y-2">
                  <Package className="w-12 h-12 text-gray-300 mx-auto" />
                  <h3 className="text-sm font-black text-gray-800">Aucun article actif</h3>
                  <p className="text-xs text-gray-400">
                    Ce vendeur n'a pas encore publié d'annonce en ligne.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {listingCardData.map((listing) => (
                    <ListingCard key={listing.id} listing={listing as any} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-3">
              {reviews.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center space-y-2">
                  <Star className="w-10 h-10 text-gray-300 mx-auto" />
                  <h3 className="text-sm font-black text-gray-800">Pas encore d'avis</h3>
                  <p className="text-xs text-gray-400">
                    Les retours des acheteurs apparaîtront ici après leurs commandes.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {reviews.map((review, index) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.04 }}
                      className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            src={review.reviewer?.avatar_url}
                            name={review.reviewer?.full_name}
                            size="sm"
                          />
                          <div>
                            <p className="text-xs font-black text-gray-900">
                              {review.reviewer?.full_name || 'Acheteur'}
                            </p>
                            <span className="text-[10px] text-gray-400">
                              {formatDate(review.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-xs text-gray-600 leading-relaxed pl-1">
                          {review.comment}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Carte Paiement à la Livraison */}
              {deliverySettings?.cash_on_delivery_enabled ? (
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-3xl p-5 space-y-2 relative overflow-hidden sm:col-span-2">
                  <div className="flex items-center gap-3 text-emerald-800">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                      <HandCoins className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-emerald-950 uppercase tracking-wider">
                        Paiement à la Livraison Activé
                      </h4>
                      <p className="text-[11px] font-bold text-emerald-700">
                        Ce vendeur accepte le règlement en mains propres
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-900/80 leading-relaxed pt-1">
                    Commandez sereinement et payez directement en espèces ou par Mobile Money auprès du livreur lors de la remise de votre colis à Daloa.
                  </p>
                </div>
              ) : null}

              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-2">
                <div className="flex items-center gap-2.5 text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Paiement Sécurisé Escrow
                  </h4>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Votre argent est conservé en toute sécurité par DaloaMarket jusqu'à ce que vous confirmiez la bonne réception de votre commande.
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-2">
                <div className="flex items-center gap-2.5 text-orange-600">
                  <Truck className="w-5 h-5" />
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Livraison DaloaDelivery
                  </h4>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Livraison rapide en point relais ou directement à votre porte partout à Daloa avec suivi en temps réel.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerProfilePage;