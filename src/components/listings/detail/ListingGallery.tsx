import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Flag,
  Pencil,
  Share2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ImageOff,
} from 'lucide-react';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import FavoriteButton from '../FavoriteButton';
import type { ListingFull } from '../../../types/listing';

interface ListingGalleryProps {
  listing: ListingFull;
  isOwner: boolean;
  isFavorite: boolean;
  onShare: () => void;
  onReport: () => void;
  onOpenLightbox: (index: number) => void;
}

/**
 * Galerie plein écran immersive : c'est le SEUL système de navigation visible
 * sur cette page (l'AppBar générique est masquée), pour éviter le double-chrome.
 */
const ListingGallery: React.FC<ListingGalleryProps> = ({
  listing,
  isOwner,
  isFavorite,
  onShare,
  onReport,
  onOpenLightbox,
}) => {
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);

  const images = listing.photos?.length ? listing.photos : [];
  const nextImage = () => {
    if (images.length) setCurrentImage((prev) => (prev + 1) % images.length);
  };
  const prevImage = () => {
    if (images.length) setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="lg:sticky lg:top-20">
      <div className="relative w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[4/3] lg:max-h-none max-h-[460px] bg-gray-900 overflow-hidden group rounded-b-[36px] lg:rounded-3xl shadow-lg">
        {/* TOP FLOATING BAR */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
          <button
            onClick={() => navigate(-1)}
            className="pointer-events-auto w-10 h-10 rounded-2xl bg-black/45 backdrop-blur-md text-white flex items-center justify-center shadow-lg hover:bg-black/70 active:scale-95 transition-all"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={onShare}
              className="w-10 h-10 rounded-2xl bg-black/45 backdrop-blur-md text-white flex items-center justify-center shadow-lg hover:bg-black/70 active:scale-95 transition-all"
              aria-label="Partager"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <FavoriteButton listingId={listing.id} isFavorited={isFavorite} />
            {isOwner && (
              <button
                onClick={() => navigate(`/create-listing?id=${listing.id}`)}
                className="w-10 h-10 rounded-2xl bg-black/45 backdrop-blur-md text-white flex items-center justify-center shadow-lg hover:bg-black/70 active:scale-95 transition-all"
                aria-label="Modifier"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onReport}
              className="w-10 h-10 rounded-2xl bg-black/45 backdrop-blur-md text-white flex items-center justify-center shadow-lg hover:bg-black/70 active:scale-95 transition-all"
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
              onClick={() => onOpenLightbox(currentImage)}
              initial={{ opacity: 0.7, scale: 1.02 }}
              animate={{ opacity: imageLoading ? 0 : 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            />

            <button
              onClick={() => onOpenLightbox(currentImage)}
              className="absolute bottom-3 right-3 bg-black/45 backdrop-blur-md text-white px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              {images.length > 1 ? `${currentImage + 1}/${images.length}` : 'Agrandir'}
            </button>

            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="hidden lg:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur-md rounded-2xl items-center justify-center text-white hover:bg-black/60 active:scale-95 transition-all"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 backdrop-blur-md rounded-2xl items-center justify-center text-white hover:bg-black/60 active:scale-95 transition-all"
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>

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
        <div className="hidden lg:flex bg-white border border-gray-100 rounded-3xl mt-3 px-4 py-3 items-center gap-2 overflow-x-auto scrollbar-none shadow-lg shadow-gray-200/40">
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
    </div>
  );
};

export default ListingGallery;
