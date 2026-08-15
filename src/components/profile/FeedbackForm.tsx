import React, { useState } from 'react';
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
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface FeedbackFormProps {
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type FeedbackType = 'suggestion' | 'bug' | 'feature' | 'general';

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

const FEEDBACK_TYPES: { id: FeedbackType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'general', label: 'Avis global', icon: MessageSquare },
  { id: 'suggestion', label: 'Suggestion', icon: Sparkles },
  { id: 'feature', label: 'Idée de fonction', icon: Lightbulb },
  { id: 'bug', label: 'Signaler un bug', icon: AlertCircle },
];

const TOPIC_OPTIONS: TopicOption[] = [
  { id: 'prefers_native_app', label: 'Application mobile', icon: Smartphone },
  { id: 'search_navigation_issue', label: 'Recherche & filtres', icon: Search },
  { id: 'pricing_too_high', label: 'Livraison & tarifs', icon: Truck },
  { id: 'visibility_issue', label: 'Visibilité des annonces', icon: Eye },
  { id: 'payment_security_issue', label: 'Paiements & sécurité', icon: ShieldCheck },
  { id: 'slow_response_issue', label: 'Fluidité & rapidité', icon: Zap },
  { id: 'complex_checkout_issue', label: 'Processus de commande', icon: ShoppingBag },
];

const RATING_LABELS: Record<number, string> = {
  1: 'Très insatisfait',
  2: 'Insatisfait',
  3: 'Correct',
  4: 'Satisfait',
  5: 'Très satisfait',
};

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ userId, onSuccess, onCancel }) => {
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<FeedbackType>('general');
  const [comment, setComment] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<Record<TopicKey, boolean>>({
    prefers_native_app: false,
    pricing_too_high: false,
    visibility_issue: false,
    search_navigation_issue: false,
    payment_security_issue: false,
    slow_response_issue: false,
    complex_checkout_issue: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const toggleTopic = (id: TopicKey) => {
    setSelectedTopics((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const activeRating = hoverRating ?? rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasTopics = Object.values(selectedTopics).some(Boolean);
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
      toast.success('Votre retour a bien été transmis.');
      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      toast.error("Une erreur est survenue lors de l'envoi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm"
        >
          <CheckCircle2 className="w-7 h-7 stroke-[2.2]" />
        </motion.div>
        <div>
          <h3 className="text-base font-bold text-gray-900">Merci pour votre retour</h3>
          <p className="text-xs text-gray-500 max-w-xs mt-1 leading-relaxed">
            Vos remarques sont précieuses pour nous aider à faire évoluer la plateforme.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type de retour */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
          Catégorie
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FEEDBACK_TYPES.map((type) => {
            const isSelected = selectedType === type.id;
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  'flex items-center justify-center gap-2 h-10 px-3 rounded-xl text-xs font-semibold border transition-all duration-150 active:scale-[0.98]',
                  isSelected
                    ? 'bg-orange-50/80 border-orange-500/40 text-orange-600 font-bold shadow-xs'
                    : 'bg-white border-gray-200/80 text-gray-600 hover:border-gray-300 hover:bg-gray-50/60'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', isSelected ? 'text-orange-600' : 'text-gray-400')} />
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Évaluation globale par étoiles */}
      <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-2xl text-center space-y-2.5">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
          Note de satisfaction globale
        </span>
        <div className="flex items-center justify-center gap-2">
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
                className="p-1 rounded-lg transition-transform hover:scale-110 active:scale-95 focus:outline-none"
              >
                <Star
                  className={cn(
                    'w-7 h-7 transition-colors duration-150',
                    isFilled
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-transparent text-gray-300 hover:text-gray-400'
                  )}
                  strokeWidth={1.8}
                />
              </button>
            );
          })}
        </div>
        {activeRating && (
          <p className="text-xs font-semibold text-gray-700 transition-opacity">
            {RATING_LABELS[activeRating]}
          </p>
        )}
      </div>

      {/* Thématiques concernées */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
          Thèmes concernés <span className="text-gray-400 font-normal lowercase">(facultatif)</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TOPIC_OPTIONS.map((topic) => {
            const isSelected = selectedTopics[topic.id];
            const Icon = topic.icon;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => toggleTopic(topic.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs transition-all duration-150 active:scale-[0.98]',
                  isSelected
                    ? 'bg-gray-900 text-white font-medium border border-gray-900 shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-50 hover:border-gray-300 font-normal'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', isSelected ? 'text-white' : 'text-gray-400')} />
                <span>{topic.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Zone de texte */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Détails & suggestions
          </label>
          <span className="text-[11px] text-gray-400 font-mono">
            {comment.length}/500
          </span>
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 500))}
          placeholder="Décrivez votre expérience, signalez un problème ou proposez une amélioration..."
          rows={4}
          className="w-full px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 bg-white border border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 focus:outline-none transition-all resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5 pt-1">
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
          className="flex-[2] h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
  );
};
