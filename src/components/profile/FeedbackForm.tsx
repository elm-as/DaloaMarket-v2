import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Star,
  CheckCircle2,
  Lightbulb,
  AlertCircle,
  MessageSquare,
  Smartphone,
  Search,
  Truck,
  Eye,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Send,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { UserFeedbacksList, type UserFeedbackItem } from './UserFeedbacksList';

interface FeedbackFormProps {
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type FeedbackType = 'general' | 'bug' | 'feature' | 'pricing';

interface FeedbackTypeOption {
  id: FeedbackType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

type TopicKey =
  | 'prefers_native_app'
  | 'pricing_too_high'
  | 'visibility_issue'
  | 'search_navigation_issue'
  | 'payment_security_issue'
  | 'slow_response_issue'
  | 'complex_checkout_issue';

interface TopicOption {
  id: TopicKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FEEDBACK_TYPES: FeedbackTypeOption[] = [
  { id: 'general', label: 'Général', icon: MessageSquare },
  { id: 'feature', label: 'Suggestion', icon: Lightbulb },
  { id: 'bug', label: 'Problème', icon: AlertCircle },
  { id: 'pricing', label: 'Tarifs / PRO', icon: Zap },
];

const TOPIC_OPTIONS: TopicOption[] = [
  { id: 'prefers_native_app', label: 'Application mobile', icon: Smartphone },
  { id: 'pricing_too_high', label: 'Tarifs trop élevés', icon: Zap },
  { id: 'visibility_issue', label: 'Visibilité des annonces', icon: Eye },
  { id: 'search_navigation_issue', label: 'Recherche & navigation', icon: Search },
  { id: 'payment_security_issue', label: 'Paiement sécurisé', icon: ShieldCheck },
  { id: 'slow_response_issue', label: 'Lenteur des réponses', icon: ShoppingBag },
  { id: 'complex_checkout_issue', label: 'Processus d’achat', icon: Truck },
];

const RATING_LABELS: Record<number, string> = {
  1: 'Très insatisfait',
  2: 'Peu satisfait',
  3: 'Moyen',
  4: 'Satisfait',
  5: 'Très satisfait !',
};

const EMPTY_TOPICS: Record<TopicKey, boolean> = {
  prefers_native_app: false,
  pricing_too_high: false,
  visibility_issue: false,
  search_navigation_issue: false,
  payment_security_issue: false,
  slow_response_issue: false,
  complex_checkout_issue: false,
};

const SectionLabel: React.FC<{ children: React.ReactNode; hint?: string }> = ({ children, hint }) => (
  <div className="flex items-baseline gap-1.5">
    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{children}</span>
    {hint && <span className="text-[11px] text-gray-400 font-normal">{hint}</span>}
  </div>
);

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ userId, onSuccess, onCancel }) => {
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<FeedbackType>('general');
  const [comment, setComment] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<Record<TopicKey, boolean>>(EMPTY_TOPICS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [pastFeedbacks, setPastFeedbacks] = useState<UserFeedbackItem[]>([]);

  const fetchFeedbacks = useCallback(() => {
    if (!userId) return;
    (supabase as any)
      .from('user_feedbacks')
      .select('id, dislikes, admin_reply, replied_at, created_at, source')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }: any) => {
        if (data) setPastFeedbacks(data);
      });
  }, [userId]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const toggleTopic = (id: TopicKey) => {
    setSelectedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const activeRating = hoverRating ?? rating;
  const selectedTopicCount = Object.values(selectedTopics).filter(Boolean).length;

  const resetForm = () => {
    setIsSubmitted(false);
    setRating(null);
    setHoverRating(null);
    setSelectedType('general');
    setComment('');
    setSelectedTopics(EMPTY_TOPICS);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasTopics = selectedTopicCount > 0;
    if (!comment.trim() && !hasTopics && rating === null) {
      toast.error('Veuillez attribuer une note ou renseigner un commentaire.');
      return;
    }

    setIsSubmitting(true);
    try {
      const typeLabel = FEEDBACK_TYPES.find((t) => t.id === selectedType)?.label || 'Avis';
      const ratingText = rating ? `[Note: ${rating}/5 - ${RATING_LABELS[rating]}]` : '';
      const typeText = `[Type: ${typeLabel}]`;

      const selectedTopicLabels = TOPIC_OPTIONS
        .filter((t) => selectedTopics[t.id])
        .map((t) => t.label);
      const topicsText = selectedTopicLabels.length > 0 ? `[Thèmes: ${selectedTopicLabels.join(', ')}]` : '';

      const prefixes = [typeText, ratingText, topicsText].filter(Boolean).join(' ');
      const cleanComment = comment.trim();
      const finalContent = cleanComment ? (prefixes ? `${prefixes}\n${cleanComment}` : cleanComment) : prefixes;

      const payload: Record<string, any> = {
        user_id: userId,
        source: 'web',
        dislikes: finalContent,
        prefers_native_app: selectedTopics.prefers_native_app,
        pricing_too_high: selectedTopics.pricing_too_high,
        visibility_issue: selectedTopics.visibility_issue,
        search_navigation_issue: selectedTopics.search_navigation_issue,
        payment_security_issue: selectedTopics.payment_security_issue,
        slow_response_issue: selectedTopics.slow_response_issue,
        complex_checkout_issue: selectedTopics.complex_checkout_issue,
        recommended_features: finalContent,
      };

      let { error } = await (supabase as any).from('user_feedbacks').insert(payload);

      // Fallback si la table utilise le schéma initial
      if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
        const fallbackPayload = {
          user_id: userId,
          source: 'web',
          dislikes: finalContent,
          prefers_native_app: selectedTopics.prefers_native_app,
          pricing_too_high: selectedTopics.pricing_too_high,
          visibility_issue: selectedTopics.visibility_issue,
          recommended_features: finalContent,
        };
        const fallbackRes = await (supabase as any).from('user_feedbacks').insert(fallbackPayload);
        error = fallbackRes.error;
      }

      if (error) throw error;

      setIsSubmitted(true);
      fetchFeedbacks();
      toast.success('Votre retour a bien été transmis.');
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      toast.error(err.message || 'Impossible d’envoyer votre retour.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── ÉTAT DE CONFIRMATION ── */
  if (isSubmitted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-3 bg-emerald-50/40 border border-emerald-100 rounded-2xl">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-14 h-14 bg-white text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm"
          >
            <CheckCircle2 className="w-7 h-7 stroke-[2.2]" />
          </motion.div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Merci pour votre retour !</h3>
            <p className="text-[11px] text-gray-500 max-w-xs mt-1 leading-relaxed">
              Vos remarques nous aident à améliorer DaloaMarket. Notre équipe lit et prend en compte
              chaque avis.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={resetForm}
              className="h-9 px-4 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold text-xs hover:bg-gray-50 active:scale-95 transition-all"
            >
              Envoyer un autre avis
            </button>
            {onSuccess && (
              <button
                type="button"
                onClick={onSuccess}
                className="h-9 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs active:scale-95 transition-all"
              >
                Terminer
              </button>
            )}
          </div>
        </div>

        {pastFeedbacks.length > 0 && (
          <>
            <div className="h-px bg-gray-100" />
            <UserFeedbacksList feedbacks={pastFeedbacks} />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── NOTE DE SATISFACTION (hero) ── */}
        <div className="relative overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-b from-orange-50/70 to-white p-4 text-center space-y-2">
          <div className="flex justify-center">
            <SectionLabel>Satisfaction globale</SectionLabel>
          </div>
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
              const isFilled = (activeRating ?? 0) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                  aria-pressed={rating === star}
                  className="p-1 rounded-lg transition-transform hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30"
                >
                  <Star
                    className={cn(
                      'w-8 h-8 transition-colors duration-150',
                      isFilled
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-transparent text-gray-300 hover:text-amber-300'
                    )}
                    strokeWidth={1.8}
                  />
                </button>
              );
            })}
          </div>
          <p
            className={cn(
              'text-xs font-bold transition-colors',
              activeRating ? 'text-gray-800' : 'text-gray-400 font-medium'
            )}
          >
            {activeRating ? RATING_LABELS[activeRating] : 'Cliquez sur une étoile pour noter'}
          </p>
        </div>

        {/* ── CATÉGORIE ── */}
        <div className="space-y-2">
          <SectionLabel>Catégorie</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {FEEDBACK_TYPES.map((type) => {
              const isSelected = selectedType === type.id;
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedType(type.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    'relative flex items-center gap-2 h-11 px-3 rounded-xl text-xs border transition-all duration-150 active:scale-[0.98]',
                    isSelected
                      ? 'bg-orange-50 border-orange-500/50 text-orange-700 font-bold shadow-xs ring-1 ring-orange-500/10'
                      : 'bg-white border-gray-200/80 text-gray-600 font-semibold hover:border-gray-300 hover:bg-gray-50/60'
                  )}
                >
                  <span
                    className={cn(
                      'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                      isSelected ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="truncate">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── THÈMES ── */}
        <div className="space-y-2">
          <SectionLabel
            hint={
              selectedTopicCount > 0
                ? `· ${selectedTopicCount} sélectionné${selectedTopicCount > 1 ? 's' : ''}`
                : '(facultatif)'
            }
          >
            Thèmes concernés
          </SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {TOPIC_OPTIONS.map((topic) => {
              const isSelected = selectedTopics[topic.id];
              const Icon = topic.icon;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => toggleTopic(topic.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-8 pl-2.5 pr-3 rounded-full text-[11px] border transition-all duration-150 active:scale-[0.98]',
                    isSelected
                      ? 'bg-gray-900 text-white font-semibold border-gray-900 shadow-xs'
                      : 'bg-white text-gray-600 border-gray-200/80 hover:bg-gray-50 hover:border-gray-300 font-medium'
                  )}
                >
                  {isSelected ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : (
                    <Icon className="w-3.5 h-3.5 text-gray-400" />
                  )}
                  <span>{topic.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── DÉTAILS ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <SectionLabel>Détails &amp; suggestions</SectionLabel>
            <span
              className={cn(
                'text-[11px] font-mono tabular-nums',
                comment.length >= 500 ? 'text-orange-600 font-bold' : 'text-gray-400'
              )}
            >
              {comment.length}/500
            </span>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="Décrivez votre expérience, signalez un problème ou proposez une amélioration..."
            rows={4}
            className="w-full px-3.5 py-3 text-xs text-gray-900 placeholder-gray-400 bg-white border border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 focus:outline-none transition-all resize-none leading-relaxed"
          />
        </div>

        {/* ── ACTIONS ── */}
        <div className="flex items-center gap-2.5 pt-0.5">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-700 font-semibold text-xs hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-[2] h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm shadow-orange-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{isSubmitting ? 'Envoi en cours...' : 'Envoyer mon avis'}</span>
          </button>
        </div>
      </form>

      {/* ── HISTORIQUE DES AVIS (en bas de tout, comme sur le mobile) ── */}
      {pastFeedbacks.length > 0 && (
        <>
          <div className="h-px bg-gray-100" />
          <UserFeedbacksList feedbacks={pastFeedbacks} />
        </>
      )}
    </div>
  );
};
