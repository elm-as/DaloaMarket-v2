import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Star, MessageSquare, Filter, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { AdminPageHeader, AdminButton } from './ui/AdminUI';
import { parseFeedback, type FeedbackRow } from './feedbacks/adminFeedbacks';
import { AdminFeedbackCard } from './feedbacks/AdminFeedbackCard';

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
          .select('*, users!user_id(full_name, shop_name, district)')
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

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

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
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const who = `${item.users?.shop_name || ''} ${item.users?.full_name || ''}`.toLowerCase();
    return item.parsed.body.toLowerCase().includes(q) || who.includes(q);
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

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <label htmlFor="feedback-search" className="sr-only">Rechercher dans les avis</label>
        <input
          type="text"
          id="feedback-search"
          placeholder="Rechercher dans les avis ou par nom…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs focus:border-primary focus:outline-none lg:w-64"
        />

        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          <div className="inline-flex shrink-0 gap-1 rounded-xl bg-gray-100 p-1">
            {[
              { key: 'all' as const, label: `Tous (${rows.length})`, activeCls: 'bg-white text-gray-900 shadow-xs' },
              { key: 'unanswered' as const, label: `En attente (${unanswered})`, activeCls: 'bg-amber-500 text-white shadow-xs' },
              { key: 'answered' as const, label: `Répondus (${answeredCount})`, activeCls: 'bg-emerald-600 text-white shadow-xs' },
            ].map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setStatusFilter(st.key)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  statusFilter === st.key ? st.activeCls : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <span className="ml-1 flex shrink-0 items-center gap-1 text-xs font-medium text-gray-400">
            <Filter className="h-3.5 w-3.5" />
          </span>
          <button
            type="button"
            onClick={() => setStarFilter('all')}
            className={`shrink-0 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all ${
              starFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Toutes
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setStarFilter(star)}
              className={`flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-all ${
                starFilter === star ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {star} <Star className="h-3 w-3 fill-current" />
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <MessageSquare className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <h3 className="text-sm font-bold text-gray-800">Aucun avis</h3>
          <p className="mt-1 text-xs text-gray-500">Aucun retour ne correspond aux filtres.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <AdminFeedbackCard
              key={item.id}
              item={item}
              draft={drafts[item.id]}
              isEditing={editingId === item.id}
              isSending={sending === item.id}
              onChangeDraft={(val) => setDrafts((d) => ({ ...d, [item.id]: val }))}
              onStartEdit={() => {
                setDrafts((d) => ({ ...d, [item.id]: item.admin_reply || '' }));
                setEditingId(item.id);
              }}
              onCancelEdit={() => setEditingId(null)}
              onSendReply={() => handleSendReply(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
