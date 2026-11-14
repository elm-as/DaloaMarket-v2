import React from 'react';
import {
  Star, MapPin, Store, ShoppingBag, Send, Check, Monitor, Smartphone, Edit3, X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FEEDBACK_FRICTIONS,
  type FeedbackRow,
  type ParsedFeedback,
} from './adminFeedbacks';

interface AdminFeedbackCardProps {
  item: FeedbackRow & { parsed: ParsedFeedback };
  draft: string | undefined;
  isEditing: boolean;
  isSending: boolean;
  onChangeDraft: (val: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSendReply: () => void;
}

export const AdminFeedbackCard: React.FC<AdminFeedbackCardProps> = ({
  item,
  draft,
  isEditing,
  isSending,
  onChangeDraft,
  onStartEdit,
  onCancelEdit,
  onSendReply,
}) => {
  const who = item.users?.shop_name?.trim() || item.users?.full_name?.trim() || 'Utilisateur';
  const isMerchant = Boolean(item.users?.shop_name?.trim());
  const frictions = FEEDBACK_FRICTIONS.filter((f) => item[f.key] === true);
  const answered = Boolean(item.replied_at);
  const currentDraft = draft !== undefined ? draft : (item.admin_reply || '');

  return (
    <div
      className={`rounded-2xl border bg-white p-4 sm:p-5 shadow-sm transition-shadow ${
        answered ? 'border-gray-100' : 'border-l-4 border-l-amber-400 border-y-gray-100 border-r-gray-100'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {who.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4 className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-gray-900">
              <span className="truncate">{who}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                {isMerchant ? <Store className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
                {isMerchant ? 'Marchand' : 'Acheteur'}
              </span>
            </h4>
            <p className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: fr })}
              {item.users?.district && (
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />{item.users.district}
                </span>
              )}
              <span className="inline-flex items-center gap-0.5 font-medium text-gray-500">
                {item.source === 'mobile'
                  ? <><Smartphone className="h-3 w-3 text-primary" />App Mobile</>
                  : <><Monitor className="h-3 w-3 text-blue-600" />Web</>}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {item.parsed.type && (
            <span className="rounded-xl bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
              {item.parsed.type}
            </span>
          )}
          {item.parsed.rating !== null && (
            <div className="flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 tabular-nums">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              <span className="text-xs font-bold text-amber-900">{item.parsed.rating} / 5</span>
            </div>
          )}
        </div>
      </div>

      {item.parsed.body && (
        <p className="mt-3 whitespace-pre-line rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm leading-relaxed text-gray-800">
          « {item.parsed.body} »
        </p>
      )}

      {(frictions.length > 0 || item.parsed.topics.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.parsed.topics.map((t) => (
            <span key={t} className="rounded-lg border border-stone-200 bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-700">
              {t}
            </span>
          ))}
          {frictions.map((f) => (
            <span key={String(f.key)} className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
              {f.label}
            </span>
          ))}
        </div>
      )}

      {answered && !isEditing ? (
        <div className="mt-3.5 space-y-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
              <Check className="h-3.5 w-3.5 shrink-0 stroke-[2.5] text-emerald-600" />
              <span>
                Réponse transmise {item.reply_channel ? `(${item.reply_channel === 'in_app' ? 'App/Web' : item.reply_channel})` : ''} · {formatDistanceToNow(new Date(item.replied_at as string), { addSuffix: true, locale: fr })}
              </span>
            </p>
            <button
              type="button"
              onClick={onStartEdit}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-emerald-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-white hover:text-emerald-900"
            >
              <Edit3 className="h-3 w-3" />
              Modifier
            </button>
          </div>
          <div className="rounded-lg border border-emerald-100/80 bg-white/90 p-2.5">
            <p className="whitespace-pre-line text-xs font-medium leading-relaxed text-emerald-950">
              {item.admin_reply}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-3.5 space-y-2.5 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5">
          <div className="flex items-center justify-between">
            <label htmlFor={`reply-${item.id}`} className="text-[11px] font-bold text-gray-600">
              {isEditing ? 'Modifier la réponse' : 'Répondre au client'}
            </label>
            {isEditing && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700"
              >
                <X className="h-3 w-3" /> Annuler
              </button>
            )}
          </div>
          <textarea
            id={`reply-${item.id}`}
            value={currentDraft}
            onChange={(e) => onChangeDraft(e.target.value)}
            placeholder={`Bonjour ${who}, merci pour votre retour…`}
            rows={3}
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onSendReply}
              disabled={isSending || !currentDraft.trim()}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-orange-700 disabled:pointer-events-none disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              {isSending ? 'Enregistrement…' : isEditing ? 'Mettre à jour' : 'Envoyer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
