import React, { useState, useEffect, useCallback } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { Card } from '../ui/Card';
import { Avatar } from './Avatar';
import { cn, formatDate } from '../../lib/utils';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const ProfileReviewsTab: React.FC<{ userId: string }> = ({ userId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!userId) return;
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, reviewer:users!reviews_reviewer_id_fkey(full_name, avatar_url)')
        .eq('reviewed_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews((data || []) as unknown as Review[]);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setReviewsError('Impossible de charger vos avis.');
    } finally {
      setReviewsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={cn(
          'w-4 h-4',
          i < Math.round(rating)
            ? 'text-amber-400 fill-amber-400'
            : 'text-gray-300'
        )}
      />
    ));
  };

  return (
    <>
      {reviewsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height="80px" rounded="lg" />
          ))}
        </div>
      ) : reviewsError ? (
        <ErrorState message={reviewsError} onRetry={fetchReviews} />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={<Star className="w-16 h-16 opacity-40" />}
          title="Aucun avis"
          description="Vos acheteurs pourront vous laisser des avis après une transaction."
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
            >
              <Card elevation={1} padding="sm" className="rounded-2xl">
                <div className="flex items-start gap-3">
                  <Avatar
                    src={review.reviewer?.avatar_url}
                    name={review.reviewer?.full_name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">
                        {review.reviewer?.full_name || 'Utilisateur'}
                      </p>
                      <span className="text-xs text-gray-400">
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 mt-1">
                      {renderStars(review.rating)}
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
};
