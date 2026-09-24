import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Star, MessageSquare, Filter, RefreshCw, MapPin, Store,
  ShoppingBag, Send, Check, Monitor, Smartphone, Edit3, X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { AdminPageHeader, AdminButton } from './ui/AdminUI';

interface FeedbackRow {
  id: string;
  created_at: string;
  user_id: string | null;
  dislikes: string | null;
  recommended_features: string | null;
  source: string | null;
  admin_reply: string | null;
  replied_at: string | null;
  reply_channel: string | null;
  prefers_native_app: boolean | null;
  pricing_too_high: boolean | null;
  visibility_issue: boolean | null;
  search_navigation_issue: boolean | null;
  payment_security_issue: boolean | null;
  slow_response_issue: boolean | null;
  complex_checkout_issue: boolean | null;
  users?: {
    full_name: string | null;
    shop_name: string | null;
    phone: string | null;
    district: string | null;
  } | null;
  listings_count?: number;
}

function parseFeedback(raw: string | null) {
  const text = raw || '';
  const rating = text.match(/\[Note:\s*(\d)\s*\/\s*5/i);
  const type = text.match(/\[Type:\s*([^\]]+)\]/i);
  const topics = text.match(/\[Thèmes:\s*([^\]]+)\]/i);
  const body = text.replace(/\[(Type|Note|Thèmes):[^\]]*\]/gi, '').trim();
  return {
    rating: rating ? Number(rating[1]) : null,
    type: type ? type[1].trim() : null,
    topics: topics ? topics[1].split(',').map((t) => t.trim()).filter(Boolean) : [],
    body,
  };
}

const FRICTIONS: { key: keyof FeedbackRow; label: string }[] = [
  { key: 'prefers_native_app', label: '📱 App native' },
  { key: 'pricing_too_high', label: '💰 Prix trop élevé' },
  { key: 'visibility_issue', label: '👁️ Visibilité' },
  { key: 'search_navigation_issue', label: '🔍 Recherche' },
  { key: 'payment_security_issue', label: '🔒 Sécurité' },
  { key: 'slow_response_issue', label: '⏳ Lenteur' },
  { key: 'complex_checkout_issue', label: '🛒 Achat' },
];

export function AdminFeedbacksTab() {
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [starFilter, setStarFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unanswered' | 'answered'>('all');
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_admin_feedbacks', { p_limit: 200 });
      if (error) {
        const { data: fallbackData, error: fallbackError } = await (supabase as any)
          .from('user_feedbacks')
          .select('*, users!user_id(full_name, shop_name, phone, district)')
          .order('created_at', { ascending: false })
          .limit(200);
        if (fallbackError) throw fallbackError;
        setFeedbacks((fallbackData || []) as FeedbackRow[]);
      } else {
        setFeedbacks((data || []) as FeedbackRow[]);
      }
    } catch (err) {
      console.error('Chargement des avis impossible:', err);
      toast.error('Impossible de charger les avis');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

  const rows = useMemo(
    () => feedbacks.map((f) => ({ ...f, parsed: parseFeedback(f.dislikes) })),
    [feedbacks],
  );

  const unanswered = rows.filter((r) => !r.replied_at).length;
  const answeredCount = rows.filter((r) => Boolean(r.replied_at)).length;

  const filtered = rows.filter((item) => {
    if (statusFilter === 'unanswered' && item.replied_at) return false;
    if (statusFilter === 'answered' && !item.replied_at) return false;
    if (starFilter !== 'all' && item.parsed.rating !== starFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const who = `${item.users?.shop_name || ''} ${item.users?.full_name || ''}`.toLowerCase();
      return item.parsed.body.toLowerCase().includes(q) || who.includes(q);
    }
    return true;
  });

  const handleSendReply = async (item: (typeof rows)[number]) => {
    const message = (drafts[item.id] ?? item.admin_reply ?? '').trim();
    if (!message) {
      toast.error('Écrivez votre réponse d’abord');
      return;
    }

    setSending(item.id);
    try {
      const { error } = await (supabase as any).rpc('reply_to_feedback', {
        p_feedback_id: item.id,
        p_message: message,
        p_channel: item.reply_channel || 'in_app',
      });
      if (error) throw error;

      toast.success('Réponse enregistrée avec succès');
      setEditingId(null);
      setDrafts((d) => ({ ...d, [item.id]: '' }));
      fetchFeedbacks();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Impossible d’enregistrer la réponse');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Avis"
        description={
          unanswered > 0
            ? `${unanswered} en attente de réponse · ${answeredCount} répondus`
            : `${answeredCount} avis, tous traités`
        }
        actions={
          <AdminButton icon={RefreshCw} onClick={fetchFeedbacks}>
            Actualiser
          </AdminButton>
        }
      />

      {/* Filtres */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <input
          type="text"
          id="feedback-search"
          placeholder="Rechercher dans les avis ou par nom…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-64 px-3.5 py-2 rounded-xl text-xs border border-gray-200 focus:outline-none focus:border-primary"
        />

        <div className="flex items-center gap-2 overflow-x-auto flex-wrap">
          {/* Onglets de statut */}
          <div className="inline-flex bg-gray-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tous ({rows.length})
            </button>
            <button
              onClick={() => setStatusFilter('unanswered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                statusFilter === 'unanswered' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              En attente ({unanswered})
            </button>
            <button
              onClick={() => setStatusFilter('answered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                statusFilter === 'answered' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Répondus ({answeredCount})
            </button>
          </div>

          <span className="text-xs text-gray-400 font-medium flex items-center gap-1 ml-1">
            <Filter className="w-3.5 h-3.5" />
          </span>
          <button
            onClick={() => setStarFilter('all')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              starFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Toutes
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => setStarFilter(star)}
              className={`px-2 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-0.5 ${
                starFilter === star ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {star} <Star className="w-3 h-3 fill-current" />
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="py-12 flex justify-center"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-800">Aucun avis</h3>
          <p className="text-xs text-gray-500 mt-1">Aucun retour ne correspond aux filtres.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const who = item.users?.shop_name?.trim() || item.users?.full_name?.trim() || 'Utilisateur';
            const isMerchant = Boolean(item.users?.shop_name?.trim());
            const frictions = FRICTIONS.filter((f) => item[f.key] === true);
            const answered = Boolean(item.replied_at);
            const isEditing = editingId === item.id;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-5 border shadow-sm transition-shadow hover: ${
                  answered ? 'border-gray-100' : 'border-l-4 border-l-amber-400 border-y-gray-100 border-r-gray-100'
                }`}
              >
                {/* Identité */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {who.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                        {who}
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                          {isMerchant ? <Store className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                          {isMerchant ? 'Marchand' : 'Acheteur'}
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-400 flex items-center gap-2 flex-wrap">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: fr })}
                        {item.users?.district && (
                          <span className="inline-flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />{item.users.district}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-0.5 font-medium text-gray-500">
                          {item.source === 'mobile'
                            ? <><Smartphone className="w-3 h-3 text-primary" />App Mobile</>
                            : <><Monitor className="w-3 h-3 text-blue-600" />Web</>}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.parsed.type && (
                      <span className="px-2.5 py-1 rounded-xl bg-gray-100 text-gray-600 text-[11px] font-semibold">
                        {item.parsed.type}
                      </span>
                    )}
                    {item.parsed.rating !== null && (
                      <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-bold text-amber-900">{item.parsed.rating} / 5</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Texte de l'avis */}
                {item.parsed.body && (
                  <p className="text-sm text-gray-800 mt-3 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed whitespace-pre-line">
                    « {item.parsed.body} »
                  </p>
                )}

                {/* Thèmes / étiquettes */}
                {(frictions.length > 0 || item.parsed.topics.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.parsed.topics.map((t) => (
                      <span key={t} className="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-100 text-[11px] font-medium">
                        {t}
                      </span>
                    ))}
                    {frictions.map((f) => (
                      <span key={String(f.key)} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-medium">
                        {f.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Réponse de l'équipe visible chez nous */}
                {answered && !isEditing ? (
                  <div className="mt-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                        Réponse transmise au client {item.reply_channel ? `(${item.reply_channel === 'in_app' ? 'App/Web' : item.reply_channel})` : ''} · {formatDistanceToNow(new Date(item.replied_at as string), { addSuffix: true, locale: fr })}
                      </p>
                      <button
                        onClick={() => {
                          setDrafts((d) => ({ ...d, [item.id]: item.admin_reply || '' }));
                          setEditingId(item.id);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-white/80 hover:bg-white px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors shadow-2xs"
                      >
                        <Edit3 className="w-3 h-3" />
                        Modifier
                      </button>
                    </div>
                    <div className="bg-white/90 rounded-lg p-2.5 border border-emerald-100/80">
                      <p className="text-xs text-emerald-950 whitespace-pre-line leading-relaxed font-medium">
                        {item.admin_reply}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Formulaire de réponse (nouveau ou modification) */
                  <div className="mt-3.5 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor={`reply-${item.id}`} className="text-[11px] font-bold text-gray-600">
                        {isEditing ? 'Modifier la réponse' : 'Répondre au client'}
                      </label>
                      {isEditing && (
                        <button
                          onClick={() => setEditingId(null)}
                          className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700"
                        >
                          <X className="w-3 h-3" /> Annuler
                        </button>
                      )}
                    </div>
                    <textarea
                      id={`reply-${item.id}`}
                      value={drafts[item.id] !== undefined ? drafts[item.id] : (item.admin_reply || '')}
                      onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                      placeholder={`Bonjour ${who}, merci pour votre retour…`}
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs leading-relaxed focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleSendReply(item)}
                        disabled={sending === item.id || !(drafts[item.id] ?? item.admin_reply ?? '').trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 px-4 py-2 text-xs font-bold text-white transition-all shadow-sm disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {sending === item.id ? 'Enregistrement…' : isEditing ? 'Mettre à jour' : 'Envoyer'}
                      </button>
                    </div>
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
