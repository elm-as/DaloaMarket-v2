import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';

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
  const isSold = listing?.status === 'sold';

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
          availability: listing.status === 'active' && listing.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
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
    <motion.div
      className="min-h-screen bg-gray-50/70 pb-32 lg:pb-8 relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {isSold && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-white text-5xl font-black tracking-widest mb-2 uppercase drop-shadow-lg">VENDU</div>
            <p className="text-gray-300 text-sm">Cette annonce n'est plus disponible sur le marché</p>
          </div>
        </div>
      )}

      <div className="lg:px-6 lg:pt-6 lg:grid lg:grid-cols-[1fr_420px] lg:gap-8 lg:items-start">
        <ListingGallery
          listing={listing}
          isOwner={!!isOwner}
          isFavorite={isFavorite}
          onShare={handleShare}
          onReport={handleReportRequest}
          onOpenLightbox={(index) => setLightbox({ open: true, index })}
        />

        <div className="relative z-10 px-4 lg:px-0 -mt-8 lg:mt-0 py-4 space-y-5">
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
    </motion.div>
  );
};

export default ListingDetailPage;
