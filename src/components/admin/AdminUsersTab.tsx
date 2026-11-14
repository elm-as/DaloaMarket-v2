import React from 'react';
import { Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';
import { Button } from '../ui/Button';
import { useSupabase } from '../../hooks/useSupabase';
import { BanUserModal } from './BanUserModal';
import { FlagUserModal } from './FlagUserModal';
import { AdminUsersToolbar } from './users/AdminUsersToolbar';
import { AdminUsersDesktopTable } from './users/AdminUsersDesktopTable';
import { AdminUsersMobileList } from './users/AdminUsersMobileList';
import { ADMIN_USERS_PER_PAGE, useAdminUsers } from './users/useAdminUsers';
import type { AdminUsersActions } from './users/adminUsers.types';

export const AdminUsersTab: React.FC = () => {
  const { user, userProfile } = useSupabase();
  const currentUserRole = userProfile?.role?.toLowerCase() || 'user';
  const state = useAdminUsers();

  const actions: AdminUsersActions = {
    onChangeRole: state.changeRole,
    onResetCancellations: state.handleResetCancellations,
    onUnban: state.handleUnban,
    onCopyText: (text, label) => {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copié !`);
    },
    onOpenBanModal: (u) => {
      state.setUserToBan({
        id: u.id,
        email: u.email || 'N/A',
        name: u.displayName,
        ip: u.last_ip || u.registration_ip || null,
      });
    },
    onOpenFlagModal: (u) => {
      state.setUserToFlag({
        id: u.id,
        email: u.email || 'N/A',
        name: u.displayName,
        reason: u.suspect ? u.suspect_reason : null,
      });
    },
  };

  if (state.loading && state.allUsers.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (state.error) {
    return <ErrorState message={state.error} onRetry={() => state.fetchUsers()} />;
  }

  const totalPages = Math.ceil(state.filteredUsers.length / ADMIN_USERS_PER_PAGE) || 1;
  const startItem = state.filteredUsers.length === 0 ? 0 : state.userPage * ADMIN_USERS_PER_PAGE + 1;
  const endItem = Math.min((state.userPage + 1) * ADMIN_USERS_PER_PAGE, state.filteredUsers.length);

  return (
    <div className="max-w-full space-y-5">
      <AdminUsersToolbar
        counts={state.counts}
        search={state.userSearch}
        onSearchChange={state.setUserSearch}
        activeFilter={state.platformFilter}
        onFilterChange={state.setPlatformFilter}
      />

      {state.filteredUsers.length === 0 ? (
        <EmptyState
          title="Aucun utilisateur trouvé"
          description={
            state.userSearch
              ? 'Aucun résultat ne correspond à votre recherche.'
              : 'Aucun compte dans cette catégorie.'
          }
          icon={<Users size={40} className="text-stone-400" />}
        />
      ) : (
        <>
          <AdminUsersDesktopTable
            users={state.paginatedUsers}
            context={{
              currentUserId: user?.id,
              currentUserRole,
              resettingUserId: state.resettingUser,
            }}
            actions={actions}
          />

          <AdminUsersMobileList
            users={state.paginatedUsers}
            context={{
              currentUserId: user?.id,
              currentUserRole,
              resettingUserId: state.resettingUser,
            }}
            actions={actions}
          />

          <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 sm:flex-row">
            <span className="text-xs font-medium text-stone-500">
              Affichage de <span className="tabular-nums">{startItem}</span> à{' '}
              <span className="tabular-nums">{endItem}</span> sur{' '}
              <strong className="font-bold tabular-nums text-stone-900">{state.filteredUsers.length}</strong>{' '}
              utilisateur{state.filteredUsers.length > 1 ? 's' : ''}
              {state.filteredUsers.length !== state.allUsers.length && (
                <span className="font-normal text-stone-400 tabular-nums">
                  {' '}
                  (filtré sur {state.allUsers.length} au total)
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outlined"
                onClick={() => state.setUserPage(state.userPage - 1)}
                disabled={state.userPage === 0}
                className="rounded-lg text-xs font-semibold"
              >
                Précédent
              </Button>
              <span className="px-2 text-xs font-semibold tabular-nums text-stone-600">
                Page {state.userPage + 1} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outlined"
                onClick={() => state.setUserPage(state.userPage + 1)}
                disabled={(state.userPage + 1) * ADMIN_USERS_PER_PAGE >= state.filteredUsers.length}
                className="rounded-lg text-xs font-semibold"
              >
                Suivant
              </Button>
            </div>
          </div>
        </>
      )}

      <BanUserModal
        isOpen={Boolean(state.userToBan)}
        userEmail={state.userToBan?.email || ''}
        userName={state.userToBan?.name}
        userIp={state.userToBan?.ip}
        onClose={() => state.setUserToBan(null)}
        onConfirm={state.handleConfirmBan}
      />

      <FlagUserModal
        isOpen={Boolean(state.userToFlag)}
        userEmail={state.userToFlag?.email || ''}
        userName={state.userToFlag?.name}
        currentReason={state.userToFlag?.reason}
        onClose={() => state.setUserToFlag(null)}
        onConfirm={state.handleConfirmFlag}
        onRemove={state.userToFlag?.reason ? state.handleRemoveFlag : undefined}
      />
    </div>
  );
};
