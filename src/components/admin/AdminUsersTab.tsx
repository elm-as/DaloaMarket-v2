import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, AlertTriangle, ShieldAlert, MessageSquare, RotateCcw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';
import { Button } from '../ui/Button';
import { cn, formatDate } from '../../lib/utils';
import { useSupabase } from '../../hooks/useSupabase';
import { BanUserModal } from './BanUserModal';

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
  const [resettingUser, setResettingUser] = useState<string | null>(null);

  // Modal state for banning
  const [userToBan, setUserToBan] = useState<{ id: string; email: string; name?: string | null; ip?: string | null } | null>(null);

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

  const handleOpenBanModal = (u: any) => {
    setUserToBan({
      id: u.id,
      email: u.email || 'N/A',
      name: u.full_name,
      ip: u.last_ip || u.registration_ip || null,
    });
  };

  const handleConfirmBan = async (reason: string, banIpAlso: boolean) => {
    if (!userToBan) return;
    const { error: err } = await supabase
      .from('users')
      .update({
        banned: true,
        ban_reason: reason,
      } as any)
      .eq('id', userToBan.id);

    if (err) {
      toast.error('Erreur lors du bannissement');
      return;
    }

    if (banIpAlso && userToBan.ip) {
      try {
        await (supabase.rpc as any)('ban_ip', {
          p_ip: userToBan.ip,
          p_reason: `Compte ${userToBan.email} banni (${reason})`,
        });
      } catch (ipErr) {
        console.warn('Could not ban IP:', ipErr);
      }
    }

    toast.success('Utilisateur banni avec succès');
    fetchUsers(userPage);
  };

  const handleUnban = async (userId: string) => {
    const { error: err } = await supabase
      .from('users')
      .update({
        banned: false,
        ban_reason: null,
        ban_appeal_status: null,
        ban_appeal_reason: null,
      } as any)
      .eq('id', userId);

    if (err) {
      toast.error('Erreur lors du débannissement');
      return;
    }
    toast.success('Utilisateur débanni');
    fetchUsers(userPage);
  };

  const handleResetCancellations = async (userId: string) => {
    setResettingUser(userId);
    try {
      const { data, error } = await (supabase.rpc as any)('reset_user_cancellations', {
        p_user_id: userId,
      });

      if (error) throw error;
      const res = data as any;
      if (res && res.success === false) throw new Error(res.message || 'Erreur réinitialisation');

      toast.success('Compteur d\'annulations consécutives réinitialisé (0)');
      fetchUsers(userPage);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la réinitialisation');
    } finally {
      setResettingUser(null);
    }
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
          placeholder="Rechercher par nom ou email..."
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
                const hasAppeal = u.ban_appeal_status === 'pending';
                const consecutive = u.consecutive_cancellations || 0;
                const totalCancels = u.cancellation_count || 0;

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

                    {/* Statistiques d'annulations */}
                    <div className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded-xl border border-gray-100">
                      <div>
                        <span className="text-gray-500">Annulations : </span>
                        <span className="font-bold text-gray-900">{totalCancels}</span>
                        {consecutive > 0 && (
                          <span className={cn(
                            'ml-2 px-2 py-0.5 rounded-full text-[11px] font-extrabold',
                            consecutive >= 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                          )}>
                            {consecutive} consécutive{consecutive > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {consecutive > 0 && (
                        <button
                          onClick={() => handleResetCancellations(u.id)}
                          disabled={resettingUser === u.id}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 active:scale-95 transition-transform"
                        >
                          <RotateCcw size={12} className={resettingUser === u.id ? 'animate-spin' : ''} />
                          Reset
                        </button>
                      )}
                    </div>

                    {u.banned && u.ban_reason && (
                      <div className="text-xs bg-red-500/10 text-red-600 p-2 rounded-lg border border-red-500/20">
                        <span className="font-semibold">Motif :</span> {u.ban_reason}
                      </div>
                    )}

                    {hasAppeal && (
                      <div className="text-xs bg-amber-500/10 text-amber-700 p-2 rounded-lg border border-amber-500/30 flex items-start gap-1.5">
                        <MessageSquare size={14} className="shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Contestation reçue :</span> "{u.ban_appeal_reason}"
                        </div>
                      </div>
                    )}

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
                        onClick={() => (u.banned ? handleUnban(u.id) : handleOpenBanModal(u))}
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
                  <th className="p-3">Annulations</th>
                  <th className="p-3">Statut & Raison</th>
                  <th className="p-3">Contestation</th>
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
                    
                    const isLocked = isTargetSuperAdmin && !isCurrentUserSuperAdmin;
                    const isSelf = u.id === user?.id;
                    const hasAppeal = u.ban_appeal_status === 'pending';
                    const consecutive = u.consecutive_cancellations || 0;
                    const totalCancels = u.cancellation_count || 0;

                    return (
                      <tr key={u.id} className="border-b border-[var(--color-outline)] hover:bg-gray-50/50 transition-colors">
                        {/* Nom */}
                        <td className="p-3">
                          <div className="font-bold text-gray-900">{u.full_name || 'Sans nom'}</div>
                          {(u.last_ip || u.registration_ip) && (
                            <div className="text-[11px] font-mono text-red-600 bg-red-50 inline-block px-1.5 py-0.5 rounded mt-0.5 border border-red-100">
                              IP: {u.last_ip || u.registration_ip}
                            </div>
                          )}
                        </td>
                        {/* Email */}
                        <td className="p-3">
                          <div className="text-gray-700 text-xs font-medium">{u.email || 'N/A'}</div>
                        </td>
                        {/* Rôle */}
                        <td className="p-3">
                          <select
                            value={u.role || 'user'}
                            disabled={isLocked || isSelf}
                            onChange={(e) => changeRole(u.id, e.target.value)}
                            className="px-2.5 py-1 rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface)] text-xs font-semibold text-gray-800 disabled:opacity-50"
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
                        {/* Annulations & Anti-abus */}
                        <td className="p-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="text-xs font-semibold text-gray-700">
                              Total : <strong className="text-gray-900">{totalCancels}</strong>
                            </span>
                            {consecutive > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  'px-2 py-0.5 rounded-full text-[11px] font-bold',
                                  consecutive >= 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                                )}>
                                  {consecutive} conséc.
                                </span>
                                <button
                                  onClick={() => handleResetCancellations(u.id)}
                                  disabled={resettingUser === u.id}
                                  title="Réinitialiser les annulations consécutives à 0"
                                  className="p-1 rounded-lg hover:bg-gray-200 text-gray-600 active:scale-95 transition-all"
                                >
                                  <RotateCcw size={12} className={resettingUser === u.id ? 'animate-spin' : ''} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-medium">0 conséc.</span>
                            )}
                          </div>
                        </td>
                        {/* Statut & Raison */}
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <span className={cn(
                              'px-2.5 py-0.5 rounded-full text-xs font-semibold w-max',
                              u.banned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            )}>
                              {u.banned ? 'Banni' : 'Actif'}
                            </span>
                            {u.banned && u.ban_reason && (
                              <span className="text-[11px] text-red-600 max-w-xs truncate" title={u.ban_reason}>
                                Motif : {u.ban_reason}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Contestation */}
                        <td className="p-3">
                          {hasAppeal ? (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-amber-100 text-amber-800 font-medium cursor-help"
                              title={u.ban_appeal_reason}
                            >
                              <ShieldAlert size={14} />
                              Contesté ({u.ban_appeal_reason?.slice(0, 20)}...)
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--color-on-surface-variant)] opacity-60">Aucune</span>
                          )}
                        </td>
                        {/* Date */}
                        <td className="p-3 whitespace-nowrap text-xs text-gray-600 font-medium">{formatDate(u.created_at)}</td>
                        {/* Actions */}
                        <td className="p-3">
                          <Button
                            size="sm"
                            variant={u.banned ? 'tonal' : 'outlined'}
                            color={u.banned ? 'success' : 'error'}
                            disabled={isLocked || isSelf}
                            onClick={() => (u.banned ? handleUnban(u.id) : handleOpenBanModal(u))}
                            className="active:scale-[0.97]"
                          >
                            {u.banned ? 'Débannir' : 'Bannir'}
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
                Précédent
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

      {/* Modal pour saisir la raison de bannissement */}
      <BanUserModal
        isOpen={!!userToBan}
        userEmail={userToBan?.email || ''}
        userName={userToBan?.name}
        userIp={userToBan?.ip}
        onClose={() => setUserToBan(null)}
        onConfirm={handleConfirmBan}
      />
    </motion.div>
  );
};
