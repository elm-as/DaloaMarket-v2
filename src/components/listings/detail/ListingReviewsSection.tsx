import React from 'react';
import { Star } from 'lucide-react';
import { formatDate } from '../../../lib/utils';
import { EmptyState } from '../../ui/EmptyState';
import { SectionHeader } from '../../ui/SectionHeader';
import Avatar from '../../profile/Avatar';
import ReviewForm from '../ReviewForm';
import type { ReviewData } from '../../../types/listing';

interface ListingReviewsSectionProps {
  reviews: ReviewData[];
  avgRating: number;
  listingId: string;
  sellerId: string;
  canReview: boolean;
  onSubmitted: () => void;
}

const ListingReviewsSection: React.FC<ListingReviewsSectionProps> = ({
  reviews,
  avgRating,
  listingId,
  sellerId,
  canReview,
  onSubmitted,
}) => (
  <>
    <SectionHeader title="Avis des acheteurs" />
    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-lg space-y-4">
      {reviews.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
            <div className="text-center">
              <div className="text-3xl font-black text-amber-500 leading-none">{avgRating.toFixed(1)}</div>
              <p className="text-[10px] text-gray-400 mt-1 font-bold">SUR 5</p>
            </div>
            <div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-1 font-medium">
                {reviews.length} évaluation{reviews.length > 1 ? 's' : ''} vérifiée{reviews.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar src={review.reviewer.avatar_url} name={review.reviewer.full_name} size="sm" />
                    <span className="text-xs font-bold text-gray-900">{review.reviewer.full_name}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">{formatDate(review.created_at)}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3 w-3 ${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                    />
                  ))}
                </div>
                {review.comment && <p className="text-xs text-gray-600 leading-relaxed">{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState title="Aucun avis pour le moment" description="Soyez le premier à donner votre avis après votre achat." />
      )}

      {canReview && (
        <div className="pt-3 border-t border-gray-100">
          <ReviewForm listingId={listingId} sellerId={sellerId} onSubmitted={onSubmitted} />
        </div>
      )}
    </div>
  </>
);

export default ListingReviewsSection;
