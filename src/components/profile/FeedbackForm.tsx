import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  MessageSquare,
  CheckCircle2,
  Lightbulb,
  Share2,
  Smartphone,
  DollarSign,
  EyeOff,
  Frown,
  Search,
  ShieldCheck,
  Clock,
  ShoppingBag,
  Send,
  Sparkles,
  Heart,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface FeedbackFormProps {
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type FeedbackOptionKey =
  | 'prefers_native_app'
  | 'pricing_too_high'
  | 'visibility_issue'
  | 'search_navigation_issue'
  | 'payment_security_issue'
  | 'slow_response_issue'
  | 'complex_checkout_issue';

interface QuickOption {
  id: FeedbackOptionKey;
  label: string;
  emoji: string;
  icon: React.ReactNode;
}

const SATISFACTIONS = [
  { level: 5, emoji: '😍', label: 'Génial' },
  { level: 4, emoji: '😊', label: 'Bien' },
  { level: 3, emoji: '😐', label: 'Correct' },
  { level: 2, emoji: '😕', label: 'Moyen' },
  { level: 1, emoji: '😤', label: 'Déçu' },
];

const QUICK_IDEAS = [
  '🌙 Mode sombre',
  '💬 Négociation prix',
  '🔔 Alertes WhatsApp',
  '⚡ Filtres quartier',
  '🛵 Suivi livreur live',
];

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ userId, onSuccess, onCancel }) => {
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    comment: '',
    prefers_native_app: false,
    pricing_too_high: false,
    visibility_issue: false,
    search_navigation_issue: false,
    payment_security_issue: false,
    slow_response_issue: false,
    complex_checkout_issue: false,
  });

  const quickOptions: QuickOption[] = [
    { id: 'prefers_native_app', label: 'App mobile', emoji: '📱', icon: <Smartphone className="w-3.5 h-3.5" /> },
    { id: 'pricing_too_high', label: 'Tarifs livraison', emoji: '🛵', icon: <DollarSign className="w-3.5 h-3.5" /> },
    { id: 'visibility_issue', label: 'Visibilité annonces', emoji: '👁️', icon: <EyeOff className="w-3.5 h-3.5" /> },
    { id: 'search_navigation_issue', label: 'Recherche & filtres', emoji: '🔍', icon: <Search className="w-3.5 h-3.5" /> },
    { id: 'payment_security_issue', label: 'Paiement sécurisé', emoji: '🔒', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'slow_response_issue', label: 'Rapidité / Fluidité', emoji: '⚡', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'complex_checkout_issue', label: 'Processus commande', emoji: '🛍️', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
  ];

  const toggleOption = (name: FeedbackOptionKey) => {
    setFormData((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleAddQuickIdea = (idea: string) => {
    setFormData((prev) => ({
      ...prev,
      comment: prev.comment ? `${prev.comment}, ${idea.replace(/^[^a-zA-Z0-9À-ÿ]+/, '')}` : idea.replace(/^[^a-zA-Z0-9À-ÿ]+/, ''),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasAnyOptionSelected = quickOptions.some((opt) => formData[opt.id]);
    if (!formData.comment.trim() && !hasAnyOptionSelected && satisfaction === null) {
      toast.error('Choisissez une note ou partagez un commentaire.', { icon: '✨' });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedLabels = quickOptions
        .filter((opt) => formData[opt.id])
        .map((opt) => opt.label);

      let finalComment = formData.comment.trim();
      if (satisfaction) {
        const satObj = SATISFACTIONS.find((s) => s.level === satisfaction);
        const satPrefix = `[Satisfaction: ${satObj?.emoji} ${satObj?.label}]`;
        finalComment = finalComment ? `${satPrefix} ${finalComment}` : satPrefix;
      }

      const payload: Record<string, any> = {
        user_id: userId,
        dislikes: finalComment,
        prefers_native_app: formData.prefers_native_app,
        pricing_too_high: formData.pricing_too_high,
        visibility_issue: formData.visibility_issue,
        search_navigation_issue: formData.search_navigation_issue,
        payment_security_issue: formData.payment_security_issue,
        slow_response_issue: formData.slow_response_issue,
        complex_checkout_issue: formData.complex_checkout_issue,
        recommended_features: finalComment,
      };

      let { error } = await (supabase as any).from('user_feedbacks').insert(payload);

      // Fallback in case of restricted columns in DB schema
      if (
        error &&
        (error.code === 'PGRST204' ||
          error.message?.includes('schema cache') ||
          error.message?.includes('column'))
      ) {
        let combinedText = finalComment;
        if (selectedLabels.length > 0) {
          const tagsPrefix = `[Thèmes: ${selectedLabels.join(', ')}]`;
          combinedText = combinedText ? `${tagsPrefix}\n${combinedText}` : tagsPrefix;
        }

        const fallbackPayload = {
          user_id: userId,
          dislikes: combinedText,
          prefers_native_app: formData.prefers_native_app,
          pricing_too_high: formData.pricing_too_high,
          visibility_issue: formData.visibility_issue,
          recommended_features: combinedText,
        };

        const fallbackResult = await (supabase as any).from('user_feedbacks').insert(fallbackPayload);
        error = fallbackResult.error;
      }

      if (error) throw error;

      setIsSubmitted(true);
      toast.success('Merci pour votre aide précieuse !', { icon: '🧡' });
      if (onSuccess) {
        setTimeout(onSuccess, 1600);
      }
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      toast.error("Erreur lors de l'envoi de votre avis.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 18 }}
          className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-500/25"
        >
          <CheckCircle2 className="w-8 h-8" />
        </motion.div>
        <div>
          <h3 className="text-lg font-black text-gray-900">
            Avis bien reçu !
          </h3>
          <p className="text-xs text-gray-500 max-w-xs mt-1.5 leading-relaxed font-medium">
            Chaque retour est lu directement par l'équipe pour façonner l'avenir de DaloaMarket. Merci !
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Sentiment Picker */}
      <div className="bg-gradient-to-br from-orange-50/60 to-amber-50/40 rounded-3xl p-4 border border-orange-100/70 text-center">
        <span className="text-[11px] font-black uppercase tracking-wider text-orange-950/70 block mb-2.5">
          Comment évaluez-vous votre expérience ?
        </span>
        <div className="flex justify-between items-center gap-1 max-w-xs mx-auto">
          {SATISFACTIONS.map((item) => {
            const isSelected = satisfaction === item.level;
            return (
              <button
                key={item.level}
                type="button"
                onClick={() => setSatisfaction(item.level)}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-200 active:scale-90',
                  isSelected
                    ? 'bg-white shadow-md shadow-orange-500/15 scale-110 border border-orange-200'
                    : 'hover:bg-white/60 text-gray-400 opacity-75 hover:opacity-100'
                )}
              >
                <span className="text-2xl select-none transform transition-transform">{item.emoji}</span>
                <span className={cn('text-[10px] font-bold', isSelected ? 'text-orange-600 font-black' : 'text-gray-500')}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selectable Topic Chips */}
      <div className="space-y-2">
        <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block">
          Points d'amélioration ou d'intérêt
        </label>
        <div className="flex flex-wrap gap-1.5">
          {quickOptions.map((opt) => {
            const isSelected = formData[opt.id];
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleOption(opt.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 whitespace-nowrap',
                  isSelected
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-sm shadow-orange-500/25 ring-2 ring-orange-500/20 font-black'
                    : 'bg-gray-50 hover:bg-gray-100/80 text-gray-700 border border-gray-200/60'
                )}
              >
                <span className="text-xs">{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tip banner for visibility */}
        <AnimatePresence>
          {formData.visibility_issue && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -4 }}
              className="overflow-hidden"
            >
              <div className="mt-2.5 p-3 bg-blue-50/80 border border-blue-100 rounded-2xl flex gap-2.5 items-center">
                <div className="w-7 h-7 bg-blue-100 rounded-xl shrink-0 text-blue-600 flex items-center justify-center font-bold text-xs">
                  💡
                </div>
                <p className="text-[11px] text-blue-900 font-medium leading-snug">
                  <strong>Astuce Vendeur :</strong> Partager votre lien de vitrine sur WhatsApp booste immédiatement vos visites !
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Unified Text Feedback Box */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-primary" />
            <span>Vos remarques & suggestions</span>
          </label>
          <span className="text-[10px] text-gray-400 font-bold">Facultatif</span>
        </div>

        <div className="relative">
          <textarea
            name="comment"
            value={formData.comment}
            onChange={(e) => setFormData((prev) => ({ ...prev, comment: e.target.value }))}
            placeholder="Dites-nous ce qui vous plaît, ce qui bloque ou ce que vous aimeriez voir..."
            rows={3}
            className="w-full px-4 py-3 text-xs font-medium rounded-2xl border border-gray-200/90 bg-gray-50/40 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 resize-none shadow-sm"
          />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Idées :
          </span>
          {QUICK_IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => handleAddQuickIdea(idea)}
              className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-100/80 hover:bg-orange-50 hover:text-primary hover:border-orange-200 border border-transparent text-gray-600 transition-all active:scale-95"
            >
              {idea}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 h-12 rounded-2xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 active:scale-95 transition-all"
          >
            Plus tard
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-orange-500 via-primary to-amber-600 hover:opacity-95 text-white font-black text-xs shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>{isSubmitting ? 'Envoi en cours...' : 'Envoyer mon avis'}</span>
        </button>
      </div>
    </form>
  );
};

