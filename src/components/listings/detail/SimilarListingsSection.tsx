import React from 'react';
import { SectionHeader } from '../../ui/SectionHeader';
import ListingCard from '../ListingCard';
import type { SimilarListing } from '../../../types/listing';

interface SimilarListingsSectionProps {
  listings: SimilarListing[];
}

const SimilarListingsSection: React.FC<SimilarListingsSectionProps> = ({ listings }) => {
  if (listings.length === 0) return null;

  return (
    <section className="space-y-3 pt-4 border-t border-gray-100/80">
      <SectionHeader title="Annonces similaires" />
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {listings.map((sim, idx) => (
          <ListingCard key={sim.id} listing={sim} index={idx} />
        ))}
      </div>
    </section>
  );
};

export default SimilarListingsSection;
