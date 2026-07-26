import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';
import { Button } from '../ui/Button';
import { cn, formatDate } from '../../lib/utils';
import { useSupabase } from '../../hooks/useSupabase';

export const AdminUsersTab: React.FC = () => {
  const { user, userProfile } = useSupabase();
  const currentUserRole = userProfile?.role?.toLowerCase() || 'user';
  const ITEMS_PER_PAGE = 50;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(0);
  const [userTotal, setUserTotal] = useState(0);

  const fetchUsers = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      const { data, count } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      setAllUsers(data || []);
      setUserTotal(count || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(0);
  }, [fetchUsers]);

  const goToUserPage = (page: number) => {
    setUserPage(page);
    fetchUsers(page);
  };

  const toggleBan = async (userId: string, currentBanned: boolean) => {
    const { error: err } = await supabase.from('users').update({ banned: !currentBanned }).eq('id', userId);
    if (err) { toast.error('Erreur'); return; }
    toast.success(currentBanned ? 'Utilisateur debanni' : 'Utilisateur banni');
    fetchUsers(userPage);
  };

  const changeRole = async (userId: string, newRole: string) => {
    const { error: err } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
    if (err) { toast.error('Erreur'); return; }
    toast.success('Rôle modifié');
    fetchUsers(userPage);
  };

  if (loading && allUsers.length === 0) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (error) return <ErrorState message={error} onRetry={() => fetchUsers(userPage)} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-xl font-bold text-[var(--color-on-surface)] mb-6">Gestion des utilisateurs</h2>
      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
        <input
          type="text"
          placeholder="Rechercher un utilisateur..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-on-surface)]"
        />
      </div>
      {allUsers.length === 0 ? (
        <EmptyState title="Aucun utilisateur" icon={<Users size={48} />} />
      ) : (
        <>
          {/* Card list on mobile */}
          <div className="block lg:hidden space-y-4">
            {allUsers
              .filter(
                (u) =>
                  u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                  u.email?.toLowerCase().includes(userSearch.toLowerCase())
              )
              .map((u) => {
                const isTargetSuperAdmin = (u.role || 'user').toLowerCase() === 'superadmin';
                const isCurrentUserSuperAdmin = currentUserRole === 'superadmin';
                const isCurrentUserAdmin = currentUserRole === 'admin';
                const isLocked = isTargetSuperAdmin && !isCurrentUserSuperAdmin;
                const isSelf = u.id === user?.id;

                return (
                  <div key={u.id} className="bg-[var(--color-surface)] p-4 rounded-2xl border border-[var(--color-outline)] shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-[var(--color-on-surface)]">{u.full_name || 'N/A'}</h4>
                        <p className="text-xs text-[var(--color-on-surface-variant)]">{u.email}</p>
                      </div>
                      <span className={cn(
                        'px-2.5 py-0.5 rounded-full text-xs font-semibold',
                        u.banned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      )}>
                        {u.banned ? 'Banni' : 'Actif'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--color-outline)]">
                      <div>
                        <p className="text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase">Rôle</p>
                        <select
                          value={u.role || 'user'}
                          disabled={isLocked || isSelf}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          className="mt-1 px-2 py-1 rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface)] text-xs disabled:opacity-50"
                        >
                          <option value="user">User</option>
                          <option value="pro">Pro</option>
                          <option value="helper">Helper</option>
                          <option value="moderateur">Modérateur</option>
                          {(isCurrentUserSuperAdmin || isCurrentUserAdmin) && (
                            <option value="admin">Admin</option>
                          )}
                          {isCurrentUserSuperAdmin && (
                            <option value="superadmin">SuperAdmin</option>
                          )}
                        </select>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase">Inscription</p>
                        <p className="font-medium text-[var(--color-on-surface)] mt-1">{formatDate(u.created_at)}</p>
                      </div>
                    </div>

                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant={u.banned ? 'tonal' : 'outlined'}
                        color={u.banned ? 'success' : 'error'}
                        disabled={isLocked || isSelf}
                        onClick={() => toggleBan(u.id, u.banned)}
                        className="w-full active:scale-[0.97]"
                      >
                        {u.banned ? 'Débannir' : 'Bannir'}
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Table on Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-outline)] text-left">
                  <th className="p-3">Nom</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Rôle</th>
                  <th className="p-3">Banni</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allUsers
                  .filter(
                    (u) =>
                      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.email?.toLowerCase().includes(userSearch.toLowerCase())
                  )
                  .map((u) => {
                    const isTargetSuperAdmin = (u.role || 'user').toLowerCase() === 'superadmin';
                    const isCurrentUserSuperAdmin = currentUserRole === 'superadmin';
                    const isCurrentUserAdmin = currentUserRole === 'admin';
                    
                    // Un non-superadmin ne peut pas modifier un superadmin
                    const isLocked = isTargetSuperAdmin && !isCurrentUserSuperAdmin;
                    const isSelf = u.id === user?.id;

                    return (
                      <tr key={u.id} className="border-b border-[var(--color-outline)]">
                        <td className="p-3">{u.full_name || 'N/A'}</td>
                        <td className="p-3">{u.email || 'N/A'}</td>
                        <td className="p-3">
                          <select
                            value={u.role || 'user'}
                            disabled={isLocked || isSelf}
                            onChange={(e) => changeRole(u.id, e.target.value)}
                            className="px-2 py-1 rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface)] text-sm disabled:opacity-50"
                          >
                            <option value="user">User</option>
                            <option value="pro">Pro</option>
                            <option value="helper">Helper</option>
                            <option value="moderateur">Modérateur</option>
                            {(isCurrentUserSuperAdmin || isCurrentUserAdmin) && (
                              <option value="admin">Admin</option>
                            )}
                            {isCurrentUserSuperAdmin && (
                              <option value="superadmin">SuperAdmin</option>
                            )}
                          </select>
                        </td>
                      <td className="p-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs',
                          u.banned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        )}>
                          {u.banned ? 'Oui' : 'Non'}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">{formatDate(u.created_at)}</td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant={u.banned ? 'tonal' : 'outlined'}
                          color={u.banned ? 'success' : 'error'}
                          disabled={isLocked || isSelf}
                          onClick={() => toggleBan(u.id, u.banned)}
                          className="active:scale-[0.97]"
                        >
                          {u.banned ? 'Debannir' : 'Bannir'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-[var(--color-on-surface-variant)]">
              {userTotal} utilisateurs au total
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outlined"
                onClick={() => goToUserPage(userPage - 1)}
                disabled={userPage === 0}
              >
                Precedent
              </Button>
              <Button
                size="sm"
                variant="outlined"
                onClick={() => goToUserPage(userPage + 1)}
                disabled={(userPage + 1) * ITEMS_PER_PAGE >= userTotal}
              >
                Suivant
              </Button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};
