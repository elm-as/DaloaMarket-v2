import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface InlineSellerRatingProps {
  userId: string;
  sellerId: string;
  listingId: string;
}

/**
 * Notation du vendeur directement depuis le suivi, une fois la commande
 * reçue. Un seul avis par acheteur et par annonce (contrainte UNIQUE en base).
 */
export const InlineSellerRating: React.FC<InlineSellerRatingProps> = ({ userId, sellerId, listingId }) => {
  const [existing, setExisting] = useState<number | null | undefined>(undefined);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase
      .from('reviews')
      .select('rating')
      .eq('reviewer_id', userId)
      .eq('listing_id', listingId)
      .maybeSingle()
      .then(({ data }) => alive && setExisting(data?.rating ?? null));
    return () => {
      alive = false;
    };
  }, [userId, listingId]);

  if (existing === undefined) return null;

  if (existing !== null) {
    return (
      <p className="flex items-center gap-1.5 text-[13px] text-emerald-800">
        Merci, vous avez noté ce vendeur
        <span className="inline-flex items-center gap-0.5 font-semibold">
          {existing}
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        </span>
      </p>
    );
  }

  const submit = async () => {
    if (rating === 0) return;
    setSaving(true);
    const { error } = await supabase.from('reviews').insert({
      reviewer_id: userId,
      reviewed_id: sellerId,
      listing_id: listingId,
      rating,
      comment: comment.trim(),
    });
    setSaving(false);
    if (error && error.code !== '23505') {
      toast.error('Impossible d’enregistrer votre avis');
      return;
    }
    toast.success('Merci pour votre avis');
    setExisting(rating);
  };

  const shown = hover || rating;
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-gray-900">Comment s’est passé votre achat ?</p>
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
            className="p-0.5"
          >
            <Star className={cn('h-7 w-7 transition-colors', n <= shown ? 'fill-amber-400 text-amber-400' : 'text-gray-300')} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            rows={2}
            placeholder="Un mot pour les autres acheteurs (facultatif)"
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--color-primary)]"
          />
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="h-9 rounded-xl bg-[var(--color-primary)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
          >
            {saving ? 'Envoi…' : 'Publier mon avis'}
          </button>
        </>
      )}
    </div>
  );
};
