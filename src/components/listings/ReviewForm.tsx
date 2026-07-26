import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useSupabase } from '../../hooks/useSupabase';
import { cn } from '../../lib/utils';

interface ReviewFormProps {
  listingId: string;
  sellerId: string;
  onSubmitted: () => void;
}

interface FormData {
  rating: number;
  comment: string;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ listingId, sellerId, onSubmitted }) => {
  const { user } = useSupabase();
  const [alreadyReviewed, setAlreadyReviewed] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: { rating: 0, comment: '' },
  });

  const rating = watch('rating');

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from('reviews')
        .select('id')
        .eq('reviewer_id', user.id)
        .eq('listing_id', listingId)
        .maybeSingle();
      setAlreadyReviewed(!!data);
    };
    check();
  }, [user, listingId]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    if (data.rating === 0) return;

    try {
      const { error } = await supabase.from('reviews').insert({
        reviewer_id: user.id,
        reviewed_id: sellerId,
        listing_id: listingId,
        rating: data.rating,
        comment: data.comment || '',
      });

      if (error) throw error;

      toast.success('Avis publié avec succès');
      reset();
      onSubmitted();
    } catch {
      toast.error('Erreur lors de la publication de l\'avis');
    }
  };

  if (!user || user.id === sellerId) return null;
  if (alreadyReviewed === null) return null;
  if (alreadyReviewed) {
    return (
      <div className="p-3 bg-primary-50 rounded-xl text-primary-700 text-sm border border-primary-100">
        Vous avez déjà laissé un avis pour cette annonce.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Star rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Votre note
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              onClick={() => setValue('rating', star)}
              className="transition-transform hover:scale-110 active:scale-[0.97]"
              aria-label={`Donner ${star} etoile${star > 1 ? 's' : ''}`}
            >
              <Star
                className={cn(
                  'h-7 w-7 transition-colors',
                  star <= rating
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-gray-200'
                )}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Comment textarea */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Commentaire (optionnel)
        </label>
        <textarea
          {...register('comment')}
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
          rows={3}
          placeholder="Partagez votre experience avec ce vendeur..."
        />
      </div>

      {errors.rating && (
        <p className="text-error text-sm">Merci de donner une note.</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || rating === 0}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white active:scale-[0.97] transition-all disabled:opacity-50"
        style={{ background: 'var(--gradient-primary)' }}
      >
        {isSubmitting ? 'Envoi...' : 'Publier mon avis'}
      </button>
    </form>
  );
};

export default ReviewForm;
