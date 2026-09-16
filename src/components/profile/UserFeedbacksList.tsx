import React from 'react';
import { MessageSquare, Star, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface UserFeedbackItem {
  id: string;
  dislikes: string | null;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  source?: string | null;
}

interface UserFeedbacksListProps {
  feedbacks: UserFeedbackItem[];
  className?: string;
}

function parseFeedbackText(raw: string | null) {
  const text = raw || '';
  const ratingMatch = text.match(/\[Note:\s*(\d)\s*\/\s*5/i);
  const typeMatch = text.match(/\[Type:\s*([^\]]+)\]/i);
  const topicsMatch = text.match(/\[Thèmes:\s*([^\]]+)\]/i);
  const body = text.replace(/\[(Type|Note|Thèmes):[^\]]*\]/gi, '').trim();
  return {
    rating: ratingMatch ? Number(ratingMatch[1]) : null,
    type: typeMatch ? typeMatch[1].trim() : null,
    topics: topicsMatch ? topicsMatch[1].split(',').map((t) => t.trim()).filter(Boolean) : [],
    body,
  };
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
    });
  } catch {
    return '';
  }
}

export const UserFeedbacksList: React.FC<UserFeedbacksListProps> = ({ feedbacks, className }) => {
  if (!feedbacks || feedbacks.length === 0) return null;

  return (
    <section className={cn('space-y-3', className)}>
      {/* Entête de section */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-bold text-gray-900">Vos avis ({feedbacks.length})</h3>
          <p className="text-[11px] text-gray-400 leading-tight">
            Historique de vos retours et réponses de l'équipe
          </p>
        </div>
      </div>

      <ul className="space-y-2.5">
        {feedbacks.map((item) => {
          const parsed = parseFeedbackText(item.dislikes);
          const isAnswered = Boolean(item.admin_reply);
          const creationDate = formatDate(item.created_at);
          const replyDate = formatDate(item.replied_at);

          return (
            <li
              key={item.id}
              className="bg-white border border-gray-200/80 rounded-2xl p-3.5 space-y-2.5 shadow-xs"
            >
              {/* Métadonnées + statut */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {parsed.type && (
                    <span className="inline-flex items-center h-5 px-2 rounded-md bg-gray-50 border border-gray-200 text-[10px] font-bold text-gray-600">
                      {parsed.type}
                    </span>
                  )}
                  {parsed.rating !== null && (
                    <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      {parsed.rating}/5
                    </span>
                  )}
                </div>

                {isAnswered ? (
                  <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5 stroke-[2.5]" />
                    Répondu
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700 shrink-0">
                    <Clock className="w-2.5 h-2.5" />
                    En attente
                  </span>
                )}
              </div>

              {/* Contenu de l'avis */}
              <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Votre avis
                  </span>
                  {creationDate && <span className="text-[10px] text-gray-400">{creationDate}</span>}
                </div>

                {parsed.body ? (
                  <p className="text-xs text-gray-900 font-medium leading-relaxed">« {parsed.body} »</p>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">Avis enregistré</p>
                )}

                {parsed.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {parsed.topics.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center h-5 px-1.5 rounded-md bg-white border border-gray-200/80 text-[10px] text-gray-500"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Réponse de l'équipe */}
              {isAnswered ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Équipe DaloaMarket
                    </span>
                    {replyDate && (
                      <span className="text-[10px] font-semibold text-amber-600">{replyDate}</span>
                    )}
                  </div>
                  <p className="text-xs text-amber-950 leading-relaxed">{item.admin_reply}</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-amber-50/60 border border-amber-100 rounded-lg px-3 py-2">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <p className="text-[11px] text-amber-800 leading-snug">
                    Avis bien reçu. Notre équipe prépare une réponse pour vous ici-même.
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
