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
import SellerCard from '../components/listings/detail/SellerCard';
import ListingReviewsSection from '../components/listings/detail/ListingReviewsSection';
import SimilarListingsSection from '../components/listings/detail/SimilarListingsSection';
import OwnerControls from '../components/listings/detail/OwnerControls';
import ReportListingModal from '../components/listings/detail/ReportListingModal';
import DeleteListingModal from '../components/listings/detail/DeleteListingModal';
import StickyBuyBar from '../components/listings/detail/StickyBuyBar';
import type { ListingVariant } from '../types/listing';
import { getUnavailabilityReason, isListingAvailable } from '../lib/availability';
import { getListingPath } from '../lib/utils';

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
    // Même URL que celle réellement maillée en interne et partagée
    // (`getListingPath`) : déclarer /listings/:id tout en liant /l/:id faisait
    // pointer la canonical vers une variante que rien ne référence.
    canonical: listing ? `https://daloamarket.com${getListingPath(listing.id)}` : undefined,
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
          {/* Un seul signal, discret : l'ancien écran noir plein écran « VENDU »
              bloquait la page et doublonnait ce bandeau. */}
          {isSold && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <PackageX className="h-5 w-5 shrink-0 text-gray-500" />
                <p className="text-sm text-gray-800">
                  {unavailableReason === 'sold' ? 'Cet article a été vendu.' : 'Article momentanément épuisé.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  similarListings.length > 0
                    ? document.getElementById('similar-listings-section')?.scrollIntoView({ behavior: 'smooth' })
                    : navigate('/')
                }
                className="shrink-0 text-sm font-semibold text-[var(--color-primary-dark)] hover:underline"
              >
                {similarListings.length > 0 ? 'Voir les similaires' : 'Voir d’autres articles'}
              </button>
            </div>
          )}

          <ListingInfoCard
            listing={listing}
            selectedVariant={selectedVariant}
            onVariantChange={handleVariantChange}
          />

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
            // On note le vendeur depuis le suivi, une fois la commande reçue : la base
            // refuse l'avis de quelqu'un qui n'a rien acheté.
            canReview={false}
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
