import React from 'react';
import { History, RotateCcw } from 'lucide-react';
import { formatDate } from '../../../lib/utils';
import { AdminSection, AdminBadge, AdminEmpty } from '../ui/AdminUI';

interface NotificationHistoryRow {
  id: string;
  title?: string | null;
  body?: string | null;
  url?: string | null;
  created_at: string;
}

interface Props {
  history: NotificationHistoryRow[];
  onReuseNotification: (row: { title: string; body: string; url: string }) => void;
}

export const NotificationBroadcastHistory: React.FC<Props> = ({
  history,
  onReuseNotification,
}) => {
  return (
    <AdminSection
      icon={History}
      title="Historique des diffusions"
      description="Les 20 dernières notifications envoyées."
      bodyClassName="p-0"
    >
      {history.length === 0 ? (
        <div className="p-5">
          <AdminEmpty title="Aucune notification envoyée" />
        </div>
      ) : (
        <ul className="divide-y divide-stone-100">
          {history.map((n) => (
            <li
              key={n.id}
              className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-stone-50/60 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs font-semibold text-stone-900">{n.title}</p>
                  {n.url && (
                    <span className="hidden sm:inline truncate font-mono text-[11px] text-stone-400">
                      {n.url}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{n.body}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <AdminBadge>{formatDate(n.created_at)}</AdminBadge>
                <button
                  type="button"
                  onClick={() =>
                    onReuseNotification({
                      title: n.title || '',
                      body: n.body || '',
                      url: n.url || '/',
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-100"
                  title="Réutiliser ce message"
                >
                  <RotateCcw size={11} />
                  Réutiliser
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminSection>
  );
};

