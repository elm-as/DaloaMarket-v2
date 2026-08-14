import React, { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, Filter, RefreshCw, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface UserFeedbackItem {
  id: string;
  created_at: string;
  rating: number;
  message: string;
  user_id: string | null;
  user_name?: string | null;
  user_email?: string | null;
  selected_improvements?: string[];
  mobile_app_needed?: boolean;
  delivery_price_issue?: boolean;
  visibility_issue?: boolean;
  search_issue?: boolean;
  payment_security_issue?: boolean;
  slow_seller_response?: boolean;
  complex_checkout_issue?: boolean;
}

export function AdminFeedbacksTab() {
  const [feedbacks, setFeedbacks] = useState<UserFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [starFilter, setStarFilter] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('user_feedbacks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (err: any) {
      console.error('Error fetching feedbacks:', err);
      toast.error('Erreur lors du chargement des avis');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const filteredFeedbacks = feedbacks.filter((item) => {
    if (starFilter !== 'all' && item.rating !== starFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const msg = (item.message || '').toLowerCase();
      const name = (item.user_name || '').toLowerCase();
      return msg.includes(q) || name.includes(q);
    }
    return true;
  });

  const getImprovementBadges = (item: UserFeedbackItem) => {
    const badges: string[] = [];
    if (item.selected_improvements && Array.isArray(item.selected_improvements)) {
      badges.push(...item.selected_improvements);
    }
    if (item.mobile_app_needed) badges.push('📱 Application mobile');
    if (item.delivery_price_issue) badges.push('🚚 Frais de livraison');
    if (item.visibility_issue) badges.push('👁️ Visibilité annonces');
    if (item.search_issue) badges.push('🔍 Recherche & Navigation');
    if (item.payment_security_issue) badges.push('🔒 Paiement & Sécurité');
    if (item.slow_seller_response) badges.push('⏳ Réponse vendeurs');
    if (item.complex_checkout_issue) badges.push('🛒 Processus commande');

    // Deduplicate
    return Array.from(new Set(badges));
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Avis & Feedbacks Utilisateurs
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Retours d'expérience, notes et puces d'amélioration collectés depuis le profil
          </p>
        </div>
        <button
          onClick={fetchFeedbacks}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Rechercher par message ou nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl text-xs border border-gray-200 focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          <span className="text-xs text-gray-500 font-medium flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Note :
          </span>
          <button
            onClick={() => setStarFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              starFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Toutes
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => setStarFilter(star)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                starFilter === star
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {star} <Star className="w-3 h-3 fill-current" />
            </button>
          ))}
        </div>
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-800">Aucun avis trouvé</h3>
          <p className="text-xs text-gray-500 mt-1">Aucun retour ne correspond à vos filtres actuels.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFeedbacks.map((item) => {
            const badges = getImprovementBadges(item);
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {item.user_name ? item.user_name.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        {item.user_name || 'Utilisateur Anonyme'}
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                  </div>

                  {/* Star Rating */}
                  <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-bold text-amber-900">{item.rating} / 5</span>
                  </div>
                </div>

                {/* Message */}
                {item.message && (
                  <p className="text-xs text-gray-700 mt-3 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed">
                    "{item.message}"
                  </p>
                )}

                {/* Improvement Badges */}
                {badges.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {badges.map((b, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-medium"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
