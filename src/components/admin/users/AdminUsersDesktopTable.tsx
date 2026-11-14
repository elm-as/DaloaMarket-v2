import React from 'react';
import { Copy, RotateCcw, Calendar } from 'lucide-react';
import { cn, formatDate } from '../../../lib/utils';
import Avatar from '../../profile/Avatar';
import { AdminUserModerationBadges, AdminUserPlatformBadges } from './AdminUserStatusBadges';
import { AdminUserRoleSelect, AdminUserRowActions } from './AdminUserRowControls';
import type { AdminUserRecord, AdminUsersActions } from './adminUsers.types';

interface DesktopTableProps {
  users: AdminUserRecord[];
  context: {
    currentUserId?: string;
    currentUserRole: string;
    resettingUserId: string | null;
  };
  actions: AdminUsersActions;
}

export const AdminUsersDesktopTable: React.FC<DesktopTableProps> = ({ users, context, actions }) => {
  const isCurrentSuperAdmin = context.currentUserRole === 'superadmin';

  return (
    <div className="hidden overflow-x-auto rounded-xl border border-stone-200 bg-white lg:block">
      <table className="w-full min-w-[980px] border-collapse text-left">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold text-stone-500">
            <th className="min-w-[220px] px-4 py-3">Utilisateur</th>
            <th className="min-w-[220px] px-3 py-3">Plateforme(s)</th>
            <th className="min-w-[150px] px-3 py-3">Rôle</th>
            <th className="min-w-[130px] px-3 py-3">Annulations</th>
            <th className="min-w-[120px] px-3 py-3">Statut</th>
            <th className="min-w-[120px] px-3 py-3">Inscription</th>
            <th className="w-32 min-w-[120px] px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 text-xs font-medium">
          {users.map((u) => {
            const isLocked = (u.role || 'user').toLowerCase() === 'superadmin' && !isCurrentSuperAdmin;
            const disabled = isLocked || u.id === context.currentUserId;
            const consecutive = u.consecutive_cancellations || 0;
            const ipValue = u.last_ip || u.registration_ip;

            return (
              <tr key={u.id} className={cn('transition-colors hover:bg-stone-50', u.banned && 'bg-red-50/30')}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={u.avatar_url}
                      name={u.displayName || u.email}
                      size="sm"
                      className="h-9 w-9 shrink-0 rounded-lg border border-stone-200"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('max-w-[180px] truncate font-bold', u.displayName ? 'text-stone-900' : 'italic text-stone-400')}>
                          {u.displayName || 'Sans nom'}
                        </span>
                        {u.displayNameFromDriver && (
                          <span
                            className="shrink-0 cursor-help rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600"
                            title="Nom issu de la fiche livreur."
                          >
                            nom livreur
                          </span>
                        )}
                        {u.shop_name && (
                          <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800">
                            {u.shop_name}
                          </span>
                        )}
                      </div>
                      <div className="max-w-[200px] truncate text-[11px] font-normal text-stone-500">
                        {u.email || 'Aucun email'}
                      </div>
                      {ipValue && (
                        <button
                          type="button"
                          onClick={() => actions.onCopyText(ipValue, 'Adresse IP')}
                          title="Cliquer pour copier l'IP"
                          className="mt-0.5 inline-flex items-center gap-1 rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-stone-600 hover:border-orange-300 hover:text-orange-700"
                        >
                          <span>IP: {ipValue}</span>
                          <Copy size={9} className="opacity-60" />
                        </button>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-3 py-3">
                  <AdminUserPlatformBadges user={u} />
                </td>

                <td className="px-3 py-3">
                  <AdminUserRoleSelect
                    role={u.role}
                    disabled={disabled}
                    canAssignSuperAdmin={isCurrentSuperAdmin}
                    onChange={(newRole) => actions.onChangeRole(u.id, newRole)}
                  />
                </td>

                <td className="px-3 py-3">
                  {consecutive > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'rounded border px-2 py-0.5 text-[10px] font-semibold tabular-nums',
                          consecutive >= 3
                            ? 'border-red-200 bg-red-100 text-red-700'
                            : 'border-amber-200 bg-amber-100 text-amber-800'
                        )}
                      >
                        {consecutive} conséc.
                      </span>
                      <button
                        type="button"
                        onClick={() => actions.onResetCancellations(u.id)}
                        disabled={context.resettingUserId === u.id}
                        title="Réinitialiser le compteur"
                        className="rounded p-1 text-stone-600 hover:bg-stone-100"
                      >
                        <RotateCcw size={11} className={context.resettingUserId === u.id ? 'animate-spin text-orange-600' : ''} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] font-medium tabular-nums text-emerald-700">0 conséc.</span>
                  )}
                </td>

                <td className="px-3 py-3">
                  <AdminUserModerationBadges user={u} />
                </td>

                <td className="whitespace-nowrap px-3 py-3 text-[11px] tabular-nums text-stone-600">
                  <div className="flex items-center gap-1 font-medium">
                    <Calendar size={12} className="shrink-0 text-stone-400" />
                    <span>{formatDate(u.created_at)}</span>
                  </div>
                </td>

                <td className="px-4 py-3 text-right">
                  <AdminUserRowActions
                    user={u}
                    disabled={disabled}
                    onFlag={() => actions.onOpenFlagModal(u)}
                    onToggleBan={() => (u.banned ? actions.onUnban(u.id) : actions.onOpenBanModal(u))}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
