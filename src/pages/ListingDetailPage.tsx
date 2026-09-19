import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PackageX } from 'lucide-react';

import { useSupabase } from '../hooks/useSupabase';
import { useSEO } from '../hooks/useSEO';
import { useListingDetail } from '../hooks/useListingDetail';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

import ListingGallery from '../components/listings/detail/ListingGallery';
import ListingLightbox from '../components/listings/detail/ListingLightbox';
import ListingInfoCard from '../components/listings/detail/ListingInfoCard';
import TrustBadgesRow from '../components/listings/detail/TrustBadgesRow';
import SellerCard from '../components/listings/detail/SellerCard';
import ListingReviewsSection from '../components/listings/detail/ListingReviewsSection';
import SimilarListingsSection from '../components/listings/detail/SimilarListingsSection';
import OwnerControls from '../components/listings/detail/OwnerControls';
import ReportListingModal from '../components/listings/detail/ReportListingModal';
import DeleteListingModal from '../components/listings/detail/DeleteListingModal';
import StickyBuyBar from '../components/listings/detail/StickyBuyBar';
import type { ListingVariant } from '../types/listing';
import { getUnavailabilityReason, isListingAvailable } from '../lib/availability';

const ListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSupabase();

  const {
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
  } = useListingDetail(id, user?.id);

  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();

  const selectedVariant: ListingVariant | undefined = listing?.variants?.find(
    (variant) => variant.id === selectedVariantId
  );
  const handleVariantChange = (variant: ListingVariant) => setSelectedVariantId(variant.id);

  const isOwner = user?.id === listing?.user_id;
  const isPro = !!(listing?.users?.pro_until && new Date(listing.users.pro_until) > new Date());
  // Même règle que la carte : la fiche ne regardait que `status`, donc une annonce
  // remise en vente sans restock (`active` + `stock: 0`) s'affichait comme achetable
  // avant de se faire éjecter du panier.
  const unavailableReason = getUnavailabilityReason(listing as any);
  const isSold = unavailableReason !== null;

  const productSchema = listing
    ? {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: listing.title,
        image: listing.photos && listing.photos.length > 0 ? listing.photos : ['https://daloamarket.com/web-app-manifest-512x512.png'],
        description: listing.description,
        sku: listing.id,
        offers: {
          '@type': 'Offer',
          url: `https://daloamarket.com/listings/${listing.id}`,
          priceCurrency: 'XOF',
          price: listing.price,
          itemCondition: listing.condition === 'new' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
          availability: isListingAvailable(listing as any) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Person',
            name: listing.users?.full_name || 'Vendeur DaloaMarket',
          },
        },
      }
    : undefined;

  useSEO(listing?.title || "Détails de l'annonce", {
    description: listing
      ? `${listing.description.slice(0, 150)}... Achetez à Daloa (Quartier/Zone: ${listing.district}) pour ${listing.price} FCFA sur DaloaMarket.`
      : "Détails de l'annonce sur DaloaMarket",
    keywords: listing
      ? `${listing.title}, acheter ${listing.title}, ${listing.category}, Daloa, Côte d'Ivoire`
      : 'petites annonces, Daloa',
    ogImage: listing?.photos && listing.photos.length > 0 ? listing.photos[0] : undefined,
    canonical: listing ? `https://daloamarket.com/listings/${listing.id}` : undefined,
    jsonLd: productSchema,
  });

  const handleReportRequest = () => {
    if (!user) {
      navigate('/login', { state: { from: `/l/${id}` } });
      return;
    }
    setReportOpen(true);
  };

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
    <div className="min-h-screen bg-gray-50/70 pb-32 lg:pb-8 relative">
      <div className="lg:px-6 lg:pt-6 lg:grid lg:grid-cols-[1fr_420px] lg:gap-8 lg:items-start">
        <ListingGallery
          listing={listing}
          isOwner={!!isOwner}
          isFavorite={isFavorite}
          onShare={handleShare}
          onReport={handleReportRequest}
          onOpenLightbox={(index) => setLightbox({ open: true, index })}
          isSold={isSold}
          unavailableReason={unavailableReason}
        />

        <div className="relative z-10 px-4 lg:px-0 -mt-8 lg:mt-0 py-4 space-y-5">
          {isSold && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                  <PackageX className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white font-black text-[10px] uppercase tracking-wider">
                      {unavailableReason === 'sold' ? 'Vendu' : 'Épuisé'}
                    </span>
                    <h2 className="text-sm sm:text-base font-black text-gray-900">
                      {unavailableReason === 'sold' ? 'Cet article a déjà été vendu' : 'Article épuisé'}
                    </h2>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {unavailableReason === 'sold'
                      ? "Cette annonce n'est plus disponible à l'achat. Découvrez d'autres opportunités ci-dessous."
                      : 'Le vendeur est momentanément en rupture de stock sur cet article.'}
                  </p>
                </div>
              </div>
              {similarListings.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('similar-listings-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="self-start sm:self-auto text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-200 active:scale-95 px-3.5 py-2 rounded-xl transition-all shrink-0"
                >
                  Voir les similaires
                </button>
              )}
            </div>
          )}

          <ListingInfoCard
            listing={listing}
            selectedVariant={selectedVariant}
            onVariantChange={handleVariantChange}
          />

          <TrustBadgesRow />

          <SellerCard
            listing={listing}
            isPro={isPro}
            currentUserId={user?.id}
            avgRating={avgRating}
            reviewCount={reviews.length}
          />

          <ListingReviewsSection
            reviews={reviews}
            avgRating={avgRating}
            listingId={listing.id}
            sellerId={listing.user_id}
            canReview={!!user && !isOwner}
            onSubmitted={fetchListing}
          />

          <SimilarListingsSection listings={similarListings} />

          {isOwner && !isSold && (
            <OwnerControls
              listingId={listing.id}
              markingSold={markingSold}
              onMarkSold={handleMarkSold}
              onDeleteRequest={() => setDeleteConfirmOpen(true)}
            />
          )}
        </div>
      </div>

      {!isSold && listing.user_id !== user?.id && (
        <StickyBuyBar
          listing={listing}
          selectedVariant={selectedVariant}
        />
      )}

      <ListingLightbox
        images={listing.photos || []}
        startIndex={lightbox.index}
        isOpen={lightbox.open}
        onClose={() => setLightbox((prev) => ({ ...prev, open: false }))}
        alt={listing.title}
      />

      <ReportListingModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        submitting={submittingReport}
        onSubmit={handleReportSubmit}
      />

      <DeleteListingModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        deleting={deleting}
        onConfirm={async () => {
          await handleDelete();
          setDeleteConfirmOpen(false);
        }}
      />
    </div>
  );
};

export default ListingDetailPage;
