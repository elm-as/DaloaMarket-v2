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
  icon: React.ReactNode;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ userId, onSuccess, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    dislikes: '',
    prefers_native_app: false,
    pricing_too_high: false,
    visibility_issue: false,
    search_navigation_issue: false,
    payment_security_issue: false,
    slow_response_issue: false,
    complex_checkout_issue: false,
    recommended_features: '',
  });

  const quickOptions: QuickOption[] = [
    { id: 'prefers_native_app', label: "Application mobile", icon: <Smartphone className="w-3.5 h-3.5" /> },
    { id: 'pricing_too_high', label: 'Frais & tarifs livraison', icon: <DollarSign className="w-3.5 h-3.5" /> },
    { id: 'visibility_issue', label: 'Visibilité des annonces', icon: <EyeOff className="w-3.5 h-3.5" /> },
    { id: 'search_navigation_issue', label: 'Recherche & filtres', icon: <Search className="w-3.5 h-3.5" /> },
    { id: 'payment_security_issue', label: 'Paiement & sécurité', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'slow_response_issue', label: 'Temps de réponse', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'complex_checkout_issue', label: 'Processus de commande', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
  ];

  const toggleOption = (name: FeedbackOptionKey) => {
    setFormData((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasAnyOptionSelected = quickOptions.some((opt) => formData[opt.id]);
    if (!formData.dislikes.trim() && !formData.recommended_features.trim() && !hasAnyOptionSelected) {
      toast.error('Sélectionnez au moins une option ou écrivez une suggestion.', {
        icon: '📝',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Insert feedback
      const payload: Record<string, any> = {
        user_id: userId,
        dislikes: formData.dislikes,
        prefers_native_app: formData.prefers_native_app,
        pricing_too_high: formData.pricing_too_high,
        visibility_issue: formData.visibility_issue,
        search_navigation_issue: formData.search_navigation_issue,
        payment_security_issue: formData.payment_security_issue,
        slow_response_issue: formData.slow_response_issue,
        complex_checkout_issue: formData.complex_checkout_issue,
        recommended_features: formData.recommended_features,
      };

      let { error } = await (supabase as any).from('user_feedbacks').insert(payload);

      // Fallback if schema does not have extended columns
      if (
        error &&
        (error.code === 'PGRST204' ||
          error.message?.includes('schema cache') ||
          error.message?.includes('column'))
      ) {
        const extraSelectedLabels: string[] = [];
        if (formData.search_navigation_issue) extraSelectedLabels.push('Recherche & filtres');
        if (formData.payment_security_issue) extraSelectedLabels.push('Paiement & sécurité');
        if (formData.slow_response_issue) extraSelectedLabels.push('Temps de réponse');
        if (formData.complex_checkout_issue) extraSelectedLabels.push('Processus de commande');

        let combinedDislikes = formData.dislikes;
        if (extraSelectedLabels.length > 0) {
          const prefix = `[Options sélectionnées: ${extraSelectedLabels.join(', ')}]`;
          combinedDislikes = combinedDislikes ? `${prefix}\n${combinedDislikes}` : prefix;
        }

        const fallbackPayload = {
          user_id: userId,
          dislikes: combinedDislikes,
          prefers_native_app: formData.prefers_native_app,
          pricing_too_high: formData.pricing_too_high,
          visibility_issue: formData.visibility_issue,
          recommended_features: formData.recommended_features,
        };

        const fallbackResult = await (supabase as any).from('user_feedbacks').insert(fallbackPayload);
        error = fallbackResult.error;
      }

      if (error) throw error;

      setIsSubmitted(true);
      if (onSuccess) {
        setTimeout(onSuccess, 1800);
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
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center shadow-inner"
        >
          <CheckCircle2 className="w-8 h-8" />
        </motion.div>
        <div>
          <h3 className="text-base font-black text-gray-900">
            Merci pour votre retour !
          </h3>
          <p className="text-xs text-gray-500 max-w-xs mt-1 leading-relaxed">
            Vos idées nous permettent d'améliorer DaloaMarket au quotidien pour toute la communauté.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Intro Header */}
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-orange-50/70 border border-orange-100/60">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-black text-gray-900">Votre avis compte énormément</h4>
          <p className="text-[11px] text-gray-500">
            Dites-nous ce qui peut être simplifié ou amélioré.
          </p>
        </div>
      </div>

      {/* Selectable Chips Grid */}
      <div className="space-y-2">
        <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">
          Points à perfectionner
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
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-sm font-extrabold'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200/70'
                )}
              >
                <span className={cn(isSelected ? 'text-white' : 'text-gray-500')}>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {formData.visibility_issue && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -4 }}
              className="overflow-hidden"
            >
              <div className="mt-2 p-3 bg-blue-50/80 border border-blue-100 rounded-2xl flex gap-2.5 items-start">
                <div className="p-1 bg-blue-100 rounded-lg shrink-0 text-blue-600 mt-0.5">
                  <Share2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-blue-900">Conseil visibilité</h5>
                  <p className="text-[11px] text-blue-800/80 mt-0.5 leading-snug">
                    Partagez votre lien de boutique sur WhatsApp et Facebook pour multiplier vos ventes !
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Textareas */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-black text-gray-700 flex items-center gap-1.5">
            <Frown className="w-3.5 h-3.5 text-rose-500" />
            <span>Un problème ou une frustration ?</span>
          </label>
          <textarea
            name="dislikes"
            value={formData.dislikes}
            onChange={handleChange}
            placeholder="Dites-nous ce qui ne fonctionne pas comme vous le souhaitez..."
            className="w-full h-18 px-3.5 py-2.5 text-xs font-medium rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black text-gray-700 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Une idée ou suggestion pour DaloaMarket ?</span>
          </label>
          <textarea
            name="recommended_features"
            value={formData.recommended_features}
            onChange={handleChange}
            placeholder="Ex: Mode sombre, filtres de prix, négociations rapides..."
            className="w-full h-18 px-3.5 py-2.5 text-xs font-medium rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 h-11 rounded-2xl border border-gray-200 text-gray-500 font-bold text-xs hover:bg-gray-50 active:scale-95 transition-all"
          >
            Plus tard
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-[2] h-11 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-black text-xs shadow-md shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>{isSubmitting ? 'Envoi...' : 'Envoyer mon avis'}</span>
        </button>
      </div>
    </form>
  );
};

