import React from 'react';
import { AddToCartSection } from '../AddToCartSection';
import type { ListingFull, ListingVariant } from '../../../types/listing';

interface StickyBuyBarProps {
  listing: ListingFull;
  selectedVariant?: ListingVariant;
}

/**
 * Barre d'action unique en bas de l'écran mobile pour cette page.
 * On ne montre jamais la BottomNavBar générique en même temps que cette barre.
 */
const StickyBuyBar: React.FC<StickyBuyBarProps> = ({ listing, selectedVariant }) => (
  <div
    className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 pt-3 z-40 shadow-2xl rounded-t-[28px] lg:hidden"
    style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)' }}
  >
    <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
      <AddToCartSection
        listing={listing}
        selectedVariant={selectedVariant}
      />
    </div>
  </div>
);

export default StickyBuyBar;
