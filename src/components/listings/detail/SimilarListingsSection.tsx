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
    <div className="space-y-3 pt-2">
      <SectionHeader title="Annonces similaires à Daloa" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {listings.map((sim) => (
          <ListingCard key={sim.id} listing={sim} />
        ))}
      </div>
    </div>
  );
};

export default SimilarListingsSection;
