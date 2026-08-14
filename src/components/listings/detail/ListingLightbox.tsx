import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ListingLightboxProps {
  images: string[];
  startIndex: number;
  isOpen: boolean;
  onClose: () => void;
  alt: string;
}

const ListingLightbox: React.FC<ListingLightboxProps> = ({ images, startIndex, isOpen, onClose, alt }) => {
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    if (isOpen) setIndex(startIndex);
  }, [isOpen, startIndex]);

  const next = () => setIndex((prev) => (prev + 1) % images.length);
  const prev = () => setIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <AnimatePresence>
      {isOpen && images.length > 0 && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-6 h-6" />
          </button>

          <img src={images[index]} alt={alt} className="max-w-full max-h-[80vh] object-contain rounded-xl" />

          {images.length > 1 && (
            <div className="flex items-center gap-4 mt-4">
              <button onClick={prev} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20" aria-label="Photo précédente">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <span className="text-white text-sm font-semibold">
                {index + 1} / {images.length}
              </span>
              <button onClick={next} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20" aria-label="Photo suivante">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ListingLightbox;
