import React from 'react';

const ListingCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
      {/* Image skeleton */}
      <div className="aspect-[4/3] bg-gray-200" />

      {/* Content skeleton */}
      <div className="p-3 space-y-2.5">
        {/* Title lines */}
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />

        {/* District + date */}
        <div className="flex items-center justify-between gap-2">
          <div className="h-3 bg-gray-100 rounded w-20" />
          <div className="h-3 bg-gray-100 rounded w-16" />
        </div>

        {/* Condition + seller */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="h-5 bg-gray-100 rounded-full w-16" />
          <div className="flex items-center gap-1.5">
            <div className="h-3 bg-gray-100 rounded w-14" />
            <div className="h-5 w-5 bg-gray-200 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingCardSkeleton;
