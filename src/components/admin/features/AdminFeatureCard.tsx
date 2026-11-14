import React from 'react';
import { ThumbsUp, Trophy, User, MessageSquare, CheckCircle, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { FeatureSuggestionItem } from './adminFeatures.types';

interface AdminFeatureCardProps {
  item: FeatureSuggestionItem;
  isTopVote: boolean;
  onToggleHallOfFame: (id: string, current: boolean) => void;
  onEditNote: (item: FeatureSuggestionItem) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

export const AdminFeatureCard: React.FC<AdminFeatureCardProps> = ({
  item,
  isTopVote,
  onToggleHallOfFame,
  onEditNote,
  onUpdateStatus,
  onDelete,
}) => {
  const isHighlighted = item.is_hall_of_fame || item.status === 'completed';

  return (
    <div
      className={`flex flex-col justify-between gap-4 rounded-2xl border bg-white p-4 sm:p-5 shadow-sm md:flex-row md:items-center ${
        isHighlighted ? 'border-amber-300 bg-amber-50/30 ring-1 ring-amber-300/40' : 'border-gray-100'
      }`}
    >
      <div className="flex flex-1 items-start gap-3 sm:gap-4 min-w-0">
        <div className="flex min-w-[54px] shrink-0 flex-col items-center justify-center rounded-2xl border border-amber-200/60 bg-amber-50 p-2 font-bold text-amber-700 tabular-nums">
          <ThumbsUp className="mb-0.5 h-4 w-4 fill-amber-500 text-amber-500" />
          <span className="text-sm">{item.upvotes_count || 0}</span>
          <span className="text-[9px] font-semibold text-amber-600">Votes</span>
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {item.is_hall_of_fame && (
              <span className="flex items-center gap-1 rounded-full bg-[var(--color-primary)] px-2.5 py-0.5 text-[10px] font-semibold text-white">
                <Trophy className="h-3 w-3 fill-amber-200 text-amber-200" /> Hall of Fame
              </span>
            )}
            <h4 className="text-sm font-bold text-gray-900">{item.title}</h4>
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
              {item.category}
            </span>
            {item.season_name && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {item.season_name}
              </span>
            )}
            {isTopVote && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                N°1 Top Vote
              </span>
            )}
          </div>
          {item.description && <p className="text-xs leading-relaxed text-gray-600">{item.description}</p>}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-gray-500">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <User className="h-3 w-3 text-amber-500" />
              {item.author_name || 'Membre DaloaMarket'}
            </span>
            <span>· {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: fr })}</span>
            {item.admin_notes && (
              <span className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                <CheckCircle className="h-3 w-3 text-emerald-600" /> Note dev : {item.admin_notes}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 md:self-center">
        <button
          type="button"
          onClick={() => onToggleHallOfFame(item.id, !!item.is_hall_of_fame)}
          className={`flex min-h-[36px] items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-colors ${
            item.is_hall_of_fame
              ? 'border-amber-500 bg-amber-500 text-white'
              : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          <Trophy className="h-3.5 w-3.5" />
          {item.is_hall_of_fame ? 'Au HOF' : '+ HOF'}
        </button>
        <button
          type="button"
          onClick={() => onEditNote(item)}
          className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-slate-900"
          aria-label="Modifier la note dev"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
        <select
          aria-label={`Statut de ${item.title}`}
          value={item.status}
          onChange={(e) => onUpdateStatus(item.id, e.target.value)}
          className="min-h-[36px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 outline-none"
        >
          <option value="pending">En attente</option>
          <option value="planned">Planifiée</option>
          <option value="completed">Réalisée</option>
          <option value="rejected">Rejetée</option>
        </select>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
          aria-label="Supprimer"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
