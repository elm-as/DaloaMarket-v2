import React from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { AdminUserModerationBadges, AdminUserPlatformBadges } from './AdminUserStatusBadges';
import { AdminUserRoleSelect, AdminUserRowActions } from './AdminUserRowControls';
import type { AdminUserRecord, AdminUsersActions } from './adminUsers.types';

interface MobileListProps {
  users: AdminUserRecord[];
  context: {
    currentUserId?: string;
    currentUserRole: string;
    resettingUserId: string | null;
  };
  actions: AdminUsersActions;
}

export const AdminUsersMobileList: React.FC<MobileListProps> = ({ users, context, actions }) => {
  const isCurrentSuperAdmin = context.currentUserRole === 'superadmin';

  return (
    <div className="block space-y-3 lg:hidden">
      {users.map((u) => {
        const isLocked = (u.role || 'user').toLowerCase() === 'superadmin' && !isCurrentSuperAdmin;
        const disabled = isLocked || u.id === context.currentUserId;
        const consecutive = u.consecutive_cancellations || 0;
        const totalCancels = u.cancellation_count || 0;

        return (
          <div key={u.id} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 font-bold text-stone-700">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="h-full w-full rounded-lg object-cover" />
                  ) : (
                    (u.displayName || u.email || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className={cn('truncate text-sm font-bold', u.displayName ? 'text-stone-900' : 'italic text-stone-400')}>
                    {u.displayName || 'Sans nom'}
                    {u.displayNameFromDriver && (
                      <span className="ml-1.5 rounded bg-stone-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-stone-600">
                        nom livreur
                      </span>
                    )}
                  </h4>
                  <p className="truncate text-xs text-stone-500">{u.email || 'Aucun email'}</p>
                </div>
              </div>
              <AdminUserModerationBadges user={u} />
            </div>

            <AdminUserPlatformBadges user={u} />

            <div className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 p-2.5 text-xs">
              <div>
                <span className="text-stone-500">Annulations : </span>
                <strong className="tabular-nums text-stone-900">{totalCancels}</strong>
                {consecutive > 0 && (
                  <span
                    className={cn(
                      'ml-2 rounded px-2 py-0.5 text-[10px] font-semibold tabular-nums',
                      consecutive >= 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                    )}
                  >
                    {consecutive} conséc.
                  </span>
                )}
              </div>
              {consecutive > 0 && (
                <button
                  type="button"
                  onClick={() => actions.onResetCancellations(u.id)}
                  disabled={context.resettingUserId === u.id}
                  className="flex items-center gap-1 text-xs font-semibold text-orange-700 hover:text-orange-800"
                >
                  <RotateCcw size={12} className={context.resettingUserId === u.id ? 'animate-spin' : ''} />
                  Reset
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-end justify-between gap-2 border-t border-stone-100 pt-2.5">
              <div>
                <span className="mb-1 block text-[10px] font-semibold text-stone-500">Rôle</span>
                <AdminUserRoleSelect
                  role={u.role}
                  disabled={disabled}
                  canAssignSuperAdmin={isCurrentSuperAdmin}
                  onChange={(newRole) => actions.onChangeRole(u.id, newRole)}
                />
              </div>

              <AdminUserRowActions
                user={u}
                disabled={disabled}
                onFlag={() => actions.onOpenFlagModal(u)}
                onToggleBan={() => (u.banned ? actions.onUnban(u.id) : actions.onOpenBanModal(u))}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
