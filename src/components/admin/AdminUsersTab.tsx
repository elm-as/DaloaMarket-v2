import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Users,
  ShieldAlert,
  MessageSquare,
  RotateCcw,
  ShoppingBag,
  Bike,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Shield,
  UserCheck,
  UserX,
  Filter,
  ArrowUpDown,
  Smartphone,
  Calendar,
  Layers,
  Sparkles,
  Flag,
  Trash2,
  Repeat,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';
import { Button } from '../ui/Button';
import { cn, formatDate } from '../../lib/utils';
import { useSupabase } from '../../hooks/useSupabase';
import { BanUserModal } from './BanUserModal';
import { FlagUserModal } from './FlagUserModal';
import Avatar from '../profile/Avatar';

type PlatformFilter =
  | 'all'
  | 'market_only'
  | 'delivery'
  | 'both'
  | 'banned'
  | 'appeals'
  /** Signales sans etre bloques. */
  | 'suspect'
  /** Comptes anonymises : la ligne survit a la suppression, porteuse de l'historique. */
  | 'deleted'
  /** Comptes dont l'empreinte correspond a un compte supprime. */
  | 'rejoins';

export const AdminUsersTab: React.FC = () => {
  const { user, userProfile } = useSupabase();
  const currentUserRole = userProfile?.role?.toLowerCase() || 'user';
  const ITEMS_PER_PAGE = 50;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [userPage, setUserPage] = useState(0);
  const [userTotal, setUserTotal] = useState(0);
  const [resettingUser, setResettingUser] = useState<string | null>(null);

  // Modal state for banning
  const [userToBan, setUserToBan] = useState<{ id: string; email: string; name?: string | null; ip?: string | null } | null>(null);

  // Modal state for flagging (suspect)
  const [userToFlag, setUserToFlag] = useState<{ id: string; email: string; name?: string | null; reason?: string | null } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Récupération de l'ensemble des utilisateurs (sans tronquage artificiel)
      const { data: usersData, count, error: fetchErr } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(2000);

      if (fetchErr) throw fetchErr;

      const rawUsers = usersData || [];
      const userIds = rawUsers.map((u) => u.id).filter(Boolean);

      // 2. Récupération des profils livreurs associés (dans delivery_persons)
      const deliveryMap = new Map<string, any>();
      const listingCountMap = new Map<string, number>();
      const rejoinMap = new Map<string, any>();

      if (userIds.length > 0) {
        try {
          const { data: deliveryList } = await (supabase as any)
            .from('delivery_persons')
            .select('id, user_id, name, phone, is_available, is_verified, vehicle_type, created_at, payout_network');

          if (deliveryList) {
            deliveryList.forEach((dp: any) => {
              deliveryMap.set(dp.user_id, dp);
            });
          }
        } catch (deliveryErr) {
          console.warn('Erreur non-bloquante lors du chargement des livreurs:', deliveryErr);
        }

        try {
          // Compter les annonces créées pour distinguer les vendeurs réels
          const { data: listingsData } = await supabase
            .from('listings')
            .select('user_id');

          if (listingsData) {
            listingsData.forEach((l: any) => {
              listingCountMap.set(l.user_id, (listingCountMap.get(l.user_id) || 0) + 1);
            });
          }
        } catch (listingErr) {
          console.warn('Erreur non-bloquante listings:', listingErr);
        }

        try {
          // Réinscriptions détectées : un compte dont l'empreinte correspond à
          // celle d'un compte supprimé. La table n'est lisible que par un admin.
          const { data: rejoinData } = await (supabase as any)
            .from('account_rejoin_flags')
            .select('new_user_id, previous_user_id, matched_kind, auto_banned, auto_suspect, previous_state, created_at');

          if (rejoinData) {
            rejoinData.forEach((r: any) => rejoinMap.set(r.new_user_id, r));
          }
        } catch (rejoinErr) {
          console.warn('Erreur non-bloquante réinscriptions:', rejoinErr);
        }
      }

      // 3. Fusion et classification exacte des données
      const mergedUsers = rawUsers.map((u) => {
        const deliveryData = deliveryMap.get(u.id) || null;
        const listingsCount = listingCountMap.get(u.id) || 0;
        const hasDeliveryProfile = !!deliveryData || u.role === 'livreur' || (u as any).app_origin === 'delivery';
        const hasMarketProfile = listingsCount > 0 || !!u.shop_name || u.role === 'pro' || u.role === 'seller';

        // Si le compte est un livreur pur sans boutique/annonce -> DaloaDelivery Only
        // Si le compte a des annonces/boutique sans profil livreur -> DaloaMarket Only
        // Si le compte a les deux -> Both
        // Si simple client sans annonce et sans profil livreur -> DaloaMarket (acheteur)
        const isDelivery = hasDeliveryProfile;
        const isBoth = hasDeliveryProfile && hasMarketProfile;
        const isMarket = !hasDeliveryProfile || hasMarketProfile;
        const isDeliveryOnly = isDelivery && !isBoth;
        const isMarketOnly = isMarket && !isBoth;

        return {
          ...u,
          delivery_person: deliveryData,
          listings_count: listingsCount,
          isDelivery,
          isMarket,
          isBoth,
          isDeliveryOnly,
          isMarketOnly,
          rejoin: rejoinMap.get(u.id) || null,
          // Repli d'affichage : faute de nom de compte, on montre l'enseigne du
          // coursier — en signalant d'ou elle vient (voir displayNameFromDriver).
          displayName:
            (u.full_name || '').trim() || (deliveryData?.name || '').trim() || null,
          displayNameFromDriver:
            !(u.full_name || '').trim() && Boolean((deliveryData?.name || '').trim()),
        };
      });

      setAllUsers(mergedUsers);
      setUserTotal(count || mergedUsers.length);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Réinitialiser la page à 0 quand la recherche ou le filtre de plateforme change
  useEffect(() => {
    setUserPage(0);
  }, [userSearch, platformFilter]);

  const goToUserPage = (page: number) => {
    setUserPage(page);
  };

  const handleOpenBanModal = (u: any) => {
    setUserToBan({
      id: u.id,
      email: u.email || 'N/A',
      name: u.displayName,
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
    fetchUsers();
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
    toast.success('Utilisateur débanni avec succès');
    fetchUsers();
  };

  /**
   * Signalement sans blocage. Se propage : si ce compte est supprimé puis
   * recréé avec les mêmes identifiants, le nouveau est marqué à son tour.
   */
  const handleOpenFlagModal = (u: any) => {
    setUserToFlag({
      id: u.id,
      email: u.email || 'N/A',
      name: u.displayName,
      reason: u.suspect ? u.suspect_reason : null,
    });
  };

  const handleConfirmFlag = async (reason: string) => {
    if (!userToFlag) return;

    const { error: err } = await supabase
      .from('users')
      .update({
        suspect: true,
        suspect_reason: reason,
        suspect_at: new Date().toISOString(),
      } as any)
      .eq('id', userToFlag.id);

    if (err) {
      toast.error('Erreur lors du signalement');
      return;
    }

    toast.success('Compte signalé');
    fetchUsers();
  };

  const handleRemoveFlag = async () => {
    if (!userToFlag) return;

    const { error: err } = await supabase
      .from('users')
      .update({ suspect: false, suspect_reason: null, suspect_at: null } as any)
      .eq('id', userToFlag.id);

    if (err) {
      toast.error('Erreur lors du retrait');
      return;
    }

    toast.success('Signalement retiré');
    fetchUsers();
  };

  const handleResetCancellations = async (userId: string) => {
    setResettingUser(userId);
    try {
      const { data, error: rpcErr } = await (supabase.rpc as any)('reset_user_cancellations', {
        p_user_id: userId,
      });

      if (rpcErr) throw rpcErr;
      const res = data as any;
      if (res && res.success === false) throw new Error(res.message || 'Erreur réinitialisation');

      toast.success("Compteur d'annulations réinitialisé (0)");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la réinitialisation');
    } finally {
      setResettingUser(null);
    }
  };

  const changeRole = async (userId: string, newRole: string) => {
    const { error: err } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
    if (err) { toast.error('Erreur lors du changement de rôle'); return; }
    toast.success(`Rôle mis à jour : ${newRole}`);
    fetchUsers();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié !`);
  };

  // Filtered users list (effectué sur l'intégralité des utilisateurs)
  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      const query = userSearch.toLowerCase().trim();
      const matchSearch =
        !query ||
        u.full_name?.toLowerCase().includes(query) ||
        u.delivery_person?.name?.toLowerCase().includes(query) ||
        u.delivery_person?.phone?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.phone?.toLowerCase().includes(query) ||
        u.last_ip?.toLowerCase().includes(query) ||
        u.shop_name?.toLowerCase().includes(query);

      if (!matchSearch) return false;

      if (platformFilter === 'market_only') return u.isMarketOnly;
      if (platformFilter === 'delivery') return u.isDelivery;
      if (platformFilter === 'both') return u.isBoth;
      if (platformFilter === 'banned') return u.banned;
      if (platformFilter === 'appeals') return u.ban_appeal_status === 'pending';
      if (platformFilter === 'suspect') return u.suspect;
      if (platformFilter === 'deleted') return Boolean(u.deleted_at);
      if (platformFilter === 'rejoins') return Boolean(u.rejoin);

      return true;
    });
  }, [allUsers, userSearch, platformFilter]);

  // Pagination découpée sur la liste filtrée
  const paginatedUsers = useMemo(() => {
    const from = userPage * ITEMS_PER_PAGE;
    return filteredUsers.slice(from, from + ITEMS_PER_PAGE);
  }, [filteredUsers, userPage]);

  // Statistics counters (calculées sur TOUS les utilisateurs de la base)
  const counts = useMemo(() => {
    let marketCount = 0;
    let deliveryCount = 0;
    let bothCount = 0;
    let bannedCount = 0;
    let appealCount = 0;
    let suspectCount = 0;
    let deletedCount = 0;
    let rejoinCount = 0;

    allUsers.forEach((u) => {
      if (u.isMarketOnly) marketCount++;
      if (u.isDelivery) deliveryCount++;
      if (u.isBoth) bothCount++;
      if (u.banned) bannedCount++;
      if (u.ban_appeal_status === 'pending') appealCount++;
      if (u.suspect) suspectCount++;
      if (u.deleted_at) deletedCount++;
      if (u.rejoin) rejoinCount++;
    });

    return { marketCount, deliveryCount, bothCount, bannedCount, appealCount, suspectCount, deletedCount, rejoinCount };
  }, [allUsers]);

  if (loading && allUsers.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => fetchUsers()} />;
  }

  return (
    <div className="space-y-6 max-w-full">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-600" />
            Gestion des Utilisateurs
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Suivi des comptes, attribution des rôles, modération anti-abus et provenance DaloaMarket / DaloaDelivery.
          </p>
        </div>

        {/* Global Stats Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 text-orange-700 border border-orange-100/80 text-xs font-bold shadow-xs">
            <ShoppingBag className="w-3.5 h-3.5 text-orange-600" />
            <span>Market : {counts.marketCount}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100/80 text-xs font-bold shadow-xs">
            <Bike className="w-3.5 h-3.5 text-emerald-600" />
            <span>Delivery : {counts.deliveryCount}</span>
          </span>
          {counts.bothCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-100/80 text-xs font-bold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Les 2 : {counts.bothCount}</span>
            </span>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, téléphone, boutique ou IP..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-xs sm:text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>

          {/* Quick Platform Filter Pills */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setPlatformFilter('all')}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5',
                platformFilter === 'all'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
              )}
            >
              <span>Tous</span>
              <span className={cn('px-1.5 py-0.2 rounded-md text-[10px]', platformFilter === 'all' ? 'bg-white/20' : 'bg-gray-200')}>
                {allUsers.length}
              </span>
            </button>

            <button
              onClick={() => setPlatformFilter('market_only')}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5',
                platformFilter === 'market_only'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100/70 border border-orange-100'
              )}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>DaloaMarket ({counts.marketCount})</span>
            </button>

            <button
              onClick={() => setPlatformFilter('delivery')}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5',
                platformFilter === 'delivery'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70 border border-emerald-100'
              )}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>DaloaDelivery ({counts.deliveryCount})</span>
            </button>

            {counts.bothCount > 0 && (
              <button
                onClick={() => setPlatformFilter('both')}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5',
                  platformFilter === 'both'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100/70 border border-purple-100'
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Les 2 Plateformes ({counts.bothCount})</span>
              </button>
            )}

            {counts.bannedCount > 0 && (
              <button
                onClick={() => setPlatformFilter('banned')}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5',
                  platformFilter === 'banned'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-red-50 text-red-700 hover:bg-red-100/70 border border-red-100'
                )}
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Bannis ({counts.bannedCount})</span>
              </button>
            )}

            {counts.suspectCount > 0 && (
              <button
                onClick={() => setPlatformFilter('suspect')}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5',
                  platformFilter === 'suspect'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100/70 border border-orange-100'
                )}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Signalés ({counts.suspectCount})</span>
              </button>
            )}

            {counts.rejoinCount > 0 && (
              <button
                onClick={() => setPlatformFilter('rejoins')}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5',
                  platformFilter === 'rejoins'
                    ? 'bg-fuchsia-600 text-white shadow-xs'
                    : 'bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100/70 border border-fuchsia-100'
                )}
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>Réinscriptions ({counts.rejoinCount})</span>
              </button>
            )}

            {counts.deletedCount > 0 && (
              <button
                onClick={() => setPlatformFilter('deleted')}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5',
                  platformFilter === 'deleted'
                    ? 'bg-gray-700 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70 border border-gray-200'
                )}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Comptes supprimés ({counts.deletedCount})</span>
              </button>
            )}

            {counts.appealCount > 0 && (
              <button
                onClick={() => setPlatformFilter('appeals')}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5',
                  platformFilter === 'appeals'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100/70 border border-amber-100'
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Contestations ({counts.appealCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Rendering */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          title="Aucun utilisateur trouvé"
          description={userSearch ? 'Aucun résultat ne correspond à votre recherche.' : 'Aucun compte dans cette catégorie.'}
          icon={<Users size={40} className="text-gray-400" />}
        />
      ) : (
        <>
          {/* DESKTOP REDESIGNED TABLE (PC) */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/80 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                  <th className="py-3.5 px-4 min-w-[220px]">Utilisateur</th>
                  <th className="py-3.5 px-3 min-w-[220px]">Plateforme(s) Inscrite(s)</th>
                  <th className="py-3.5 px-3 min-w-[150px]">Rôle Attribué</th>
                  <th className="py-3.5 px-3 min-w-[130px]">Anti-Abus Annulations</th>
                  <th className="py-3.5 px-3 min-w-[120px]">Statut & Motif</th>
                  <th className="py-3.5 px-3 min-w-[120px]">Inscription</th>
                  <th className="py-3.5 px-4 w-32 min-w-[120px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-medium">
                {paginatedUsers.map((u) => {
                  const isTargetSuperAdmin = (u.role || 'user').toLowerCase() === 'superadmin';
                  const isCurrentUserSuperAdmin = currentUserRole === 'superadmin';
                  const isLocked = isTargetSuperAdmin && !isCurrentUserSuperAdmin;
                  const isSelf = u.id === user?.id;
                  const hasAppeal = u.ban_appeal_status === 'pending';
                  const consecutive = u.consecutive_cancellations || 0;
                  const deliveryData = u.delivery_person;

                  return (
                    <tr
                      key={u.id}
                      className={cn(
                        'hover:bg-orange-50/20 transition-colors group',
                        u.banned && 'bg-red-50/20'
                      )}
                    >
                      {/* Utilisateur (Nom + Email + IP) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {/* Avatar Circle */}
                          <Avatar
                            src={u.avatar_url}
                            name={u.displayName || u.email}
                            size="sm"
                            className="w-9 h-9 rounded-xl shadow-2xs border border-gray-200/80 shrink-0"
                          />

                          {/* Info Text */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                'font-bold truncate max-w-[180px]',
                                u.displayName ? 'text-gray-900' : 'text-gray-400 italic'
                              )}>
                                {u.displayName || 'Sans nom'}
                              </span>
                              {u.displayNameFromDriver && (
                                <span
                                  className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-bold shrink-0 cursor-help"
                                  title="Nom de la fiche livreur : le compte lui-même n'a pas de nom renseigné."
                                >
                                  nom livreur
                                </span>
                              )}
                              {u.shop_name && (
                                <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded-md font-bold">
                                  {u.shop_name}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 font-normal truncate max-w-[200px]">
                              {u.email || 'Aucun email'}
                            </div>

                            {/* IP Tag (Copyable) */}
                            {(u.last_ip || u.registration_ip) && (
                              <button
                                onClick={() => copyToClipboard(u.last_ip || u.registration_ip, 'Adresse IP')}
                                title="Cliquer pour copier l'IP"
                                className="inline-flex items-center gap-1 text-[10px] font-mono text-gray-500 hover:text-orange-600 bg-gray-100/80 hover:bg-orange-50 px-1.5 py-0.5 rounded mt-0.5 border border-gray-200/60 transition-colors"
                              >
                                <span>IP: {u.last_ip || u.registration_ip}</span>
                                <Copy size={9} className="opacity-60" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Plateforme(s) Inscrite(s) - DÉTECTION PRÉCISE ET DYNAMIQUE */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Badge DaloaMarket (Uniquement si pertinent) */}
                          {u.isMarket && (
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.8 rounded-lg bg-orange-50 text-orange-800 border border-orange-200/80 text-[11px] font-extrabold shadow-2xs">
                              <ShoppingBag className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                              <span>DaloaMarket</span>
                              {u.listings_count > 0 && (
                                <span className="text-[10px] bg-orange-200/70 text-orange-900 px-1 rounded font-bold">
                                  {u.listings_count} annonces
                                </span>
                              )}
                            </div>
                          )}

                          {/* Badge DaloaDelivery (si le profil livreur existe) */}
                          {u.isDelivery && (
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.8 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-extrabold shadow-2xs">
                              <Bike className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>DaloaDelivery</span>
                              {deliveryData?.vehicle_type && (
                                <span className="text-[10px] text-emerald-700 font-medium">
                                  ({deliveryData.vehicle_type})
                                </span>
                              )}
                            </div>
                          )}

                          {/* Badge Hybride si l'utilisateur est présent activement sur les deux */}
                          {u.isBoth && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-black">
                              <Sparkles className="w-3 h-3 text-purple-600" />
                              Compte Double (DM + DD)
                            </span>
                          )}

                          {/* Extra verification badge */}
                          {deliveryData?.is_verified && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold w-full mt-0.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Coursier vérifié
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rôle Attribué */}
                      <td className="py-3.5 px-3">
                        <select
                          value={u.role || 'user'}
                          disabled={isLocked || isSelf}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          className={cn(
                            'px-2.5 py-1 rounded-lg border text-xs font-bold transition-all outline-none cursor-pointer',
                            u.role === 'admin' || u.role === 'superadmin'
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                              : u.role === 'livreur'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : u.role === 'pro'
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : 'bg-gray-50 border-gray-200 text-gray-700'
                          )}
                        >
                          <option value="user">User (Client)</option>
                          <option value="pro">Pro (Vendeur)</option>
                          <option value="livreur">Livreur</option>
                          <option value="helper">Helper</option>
                          <option value="moderateur">Modérateur</option>
                          <option value="admin">Admin</option>
                          {isCurrentUserSuperAdmin && <option value="superadmin">SuperAdmin</option>}
                        </select>
                      </td>

                      {/* Anti-Abus Annulations */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {consecutive > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-md text-[10px] font-black',
                                  consecutive >= 3 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                                )}
                              >
                                {consecutive} conséc.
                              </span>
                              <button
                                onClick={() => handleResetCancellations(u.id)}
                                disabled={resettingUser === u.id}
                                title="Réinitialiser le compteur d'annulations consécutives"
                                className="p-1 rounded-md hover:bg-gray-100 text-gray-600 active:scale-95 transition-all"
                              >
                                <RotateCcw size={11} className={resettingUser === u.id ? 'animate-spin text-orange-600' : ''} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-emerald-600 font-medium">0 conséc.</span>
                          )}
                        </div>
                      </td>

                      {/* Statut & Motif / Contestation */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold',
                              u.banned ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            )}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full', u.banned ? 'bg-red-600' : 'bg-emerald-500 animate-pulse')} />
                            {u.banned ? 'Banni' : 'Actif'}
                          </span>

                          {u.banned && u.ban_reason && (
                            <span className="text-[10px] text-red-600 font-medium max-w-[150px] truncate" title={u.ban_reason}>
                              Motif : {u.ban_reason}
                            </span>
                          )}

                          {hasAppeal && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold cursor-help"
                              title={u.ban_appeal_reason}
                            >
                              <MessageSquare size={10} />
                              Contestation en attente
                            </span>
                          )}

                          {u.suspect && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 text-orange-900 border border-orange-200 text-[10px] font-bold cursor-help"
                              title={u.suspect_reason || 'Compte signalé'}
                            >
                              <Flag size={10} />
                              Signalé
                            </span>
                          )}

                          {u.rejoin && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-fuchsia-100 text-fuchsia-900 border border-fuchsia-200 text-[10px] font-bold cursor-help"
                              title={`Même ${u.rejoin.matched_kind === 'identity' ? 'compte Google' : 'adresse e-mail'} qu'un compte supprimé (état à l'époque : ${u.rejoin.previous_state || 'inconnu'})`}
                            >
                              <Repeat size={10} />
                              Réinscription
                            </span>
                          )}

                          {u.deleted_at && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-200 text-gray-700 border border-gray-300 text-[10px] font-bold cursor-help"
                              title={`Compte anonymisé le ${formatDate(u.deleted_at)}. La ligne est conservée : elle porte les commandes, paiements et signalements.`}
                            >
                              <Trash2 size={10} />
                              Compte supprimé
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Inscription */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-gray-600 text-[11px]">
                        <div className="flex items-center gap-1 text-gray-700 font-medium">
                          <Calendar size={12} className="text-gray-400 shrink-0" />
                          <span>{formatDate(u.created_at)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outlined"
                            disabled={isLocked || isSelf}
                            onClick={() => handleOpenFlagModal(u)}
                            title={
                              u.suspect
                                ? 'Retirer le signalement'
                                : 'Signaler sans bloquer. Suit la personne si elle supprime puis recrée son compte.'
                            }
                            className={cn(
                              'rounded-xl text-xs font-extrabold px-3 py-1.5 shadow-2xs active:scale-[0.97] transition-all flex items-center justify-center gap-1',
                              u.suspect
                                ? 'bg-orange-50 text-orange-700 border border-orange-300 hover:bg-orange-100'
                                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                            )}
                          >
                            <Flag size={13} />
                            <span>{u.suspect ? 'Signalé' : 'Signaler'}</span>
                          </Button>

                          <Button
                            size="sm"
                            variant={u.banned ? 'tonal' : 'outlined'}
                            color={u.banned ? 'success' : 'error'}
                            disabled={isLocked || isSelf}
                            onClick={() => (u.banned ? handleUnban(u.id) : handleOpenBanModal(u))}
                            className={cn(
                              'rounded-xl text-xs font-extrabold px-3 py-1.5 min-w-[84px] shadow-2xs active:scale-[0.97] transition-all flex items-center justify-center gap-1',
                              u.banned
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
                                : 'border-red-300 text-red-600 hover:bg-red-50'
                            )}
                          >
                            {u.banned ? (
                              <>
                                <UserCheck size={13} />
                                <span>Débannir</span>
                              </>
                            ) : (
                              <>
                                <UserX size={13} />
                                <span>Bannir</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="block lg:hidden space-y-3.5">
            {paginatedUsers.map((u) => {
              const isTargetSuperAdmin = (u.role || 'user').toLowerCase() === 'superadmin';
              const isCurrentUserSuperAdmin = currentUserRole === 'superadmin';
              const isLocked = isTargetSuperAdmin && !isCurrentUserSuperAdmin;
              const isSelf = u.id === user?.id;
              const hasAppeal = u.ban_appeal_status === 'pending';
              const consecutive = u.consecutive_cancellations || 0;
              const totalCancels = u.cancellation_count || 0;
              const deliveryData = u.delivery_person;

              return (
                <div key={u.id} className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-700 shrink-0">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          (u.displayName || u.email || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className={cn(
                          'font-bold text-sm truncate',
                          u.displayName ? 'text-gray-900' : 'text-gray-400 italic'
                        )}>
                          {u.displayName || 'Sans nom'}
                          {u.displayNameFromDriver && (
                            <span className="ml-1.5 text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-bold align-middle">
                              nom livreur
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0',
                        u.banned ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                      )}
                    >
                      {u.banned ? 'Banni' : 'Actif'}
                    </span>
                  </div>

                  {/* Platform Badges Mobile */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {u.isMarket && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-800 border border-orange-200 text-xs font-bold">
                        <ShoppingBag className="w-3.5 h-3.5 text-orange-600" />
                        DaloaMarket
                        {u.listings_count > 0 && <span className="text-xs">({u.listings_count} annonces)</span>}
                      </span>
                    )}
                    {u.isDelivery && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                        <Bike className="w-3.5 h-3.5 text-emerald-600" />
                        DaloaDelivery
                        {deliveryData?.vehicle_type && <span className="text-gray-500 font-normal">({deliveryData.vehicle_type})</span>}
                      </span>
                    )}
                    {u.suspect && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 text-orange-900 border border-orange-200 text-[10px] font-black"
                        title={u.suspect_reason || 'Compte signalé'}
                      >
                        <Flag className="w-3 h-3" />
                        Signalé
                      </span>
                    )}
                    {u.rejoin && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-fuchsia-100 text-fuchsia-900 border border-fuchsia-200 text-[10px] font-black">
                        <Repeat className="w-3 h-3" />
                        Réinscription
                      </span>
                    )}
                    {u.deleted_at && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-200 text-gray-700 border border-gray-300 text-[10px] font-black">
                        <Trash2 className="w-3 h-3" />
                        Compte supprimé
                      </span>
                    )}
                    {u.isBoth && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-black">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        Double Compte
                      </span>
                    )}
                  </div>

                  {/* Annulations & Anti-abus */}
                  <div className="flex items-center justify-between text-xs bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <div>
                      <span className="text-gray-500">Annulations : </span>
                      <strong className="text-gray-900">{totalCancels}</strong>
                      {consecutive > 0 && (
                        <span className={cn('ml-2 px-2 py-0.5 rounded-md text-[10px] font-bold', consecutive >= 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800')}>
                          {consecutive} conséc.
                        </span>
                      )}
                    </div>
                    {consecutive > 0 && (
                      <button
                        onClick={() => handleResetCancellations(u.id)}
                        disabled={resettingUser === u.id}
                        className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                      >
                        <RotateCcw size={12} className={resettingUser === u.id ? 'animate-spin' : ''} />
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Role and Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Rôle</span>
                      <select
                        value={u.role || 'user'}
                        disabled={isLocked || isSelf}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                        className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-xs font-bold"
                      >
                        <option value="user">User</option>
                        <option value="pro">Pro</option>
                        <option value="livreur">Livreur</option>
                        <option value="helper">Helper</option>
                        <option value="moderateur">Modérateur</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outlined"
                        disabled={isLocked || isSelf}
                        onClick={() => handleOpenFlagModal(u)}
                        className={cn(
                          'rounded-xl font-bold text-xs px-3 flex items-center gap-1',
                          u.suspect
                            ? 'bg-orange-50 text-orange-700 border border-orange-300'
                            : 'border-gray-300 text-gray-600'
                        )}
                      >
                        <Flag className="w-3.5 h-3.5" />
                        {u.suspect ? 'Signalé' : 'Signaler'}
                      </Button>

                      <Button
                        size="sm"
                        variant={u.banned ? 'tonal' : 'outlined'}
                        color={u.banned ? 'success' : 'error'}
                        disabled={isLocked || isSelf}
                        onClick={() => (u.banned ? handleUnban(u.id) : handleOpenBanModal(u))}
                        className="rounded-xl font-bold text-xs px-4"
                      >
                        {u.banned ? 'Débannir' : 'Bannir'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-gray-200/80 shadow-2xs">
            <span className="text-xs text-gray-500 font-medium">
              Affichage de {filteredUsers.length === 0 ? 0 : userPage * ITEMS_PER_PAGE + 1} à{' '}
              {Math.min((userPage + 1) * ITEMS_PER_PAGE, filteredUsers.length)} sur{' '}
              <strong className="text-gray-900 font-bold">{filteredUsers.length}</strong> utilisateur{filteredUsers.length > 1 ? 's' : ''}
              {filteredUsers.length !== allUsers.length && (
                <span className="text-gray-400 font-normal"> (filtré sur {allUsers.length} au total)</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outlined"
                onClick={() => goToUserPage(userPage - 1)}
                disabled={userPage === 0}
                className="rounded-xl text-xs font-bold"
              >
                Précédent
              </Button>
              <span className="text-xs text-gray-500 font-bold px-2">
                Page {userPage + 1} / {Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1}
              </span>
              <Button
                size="sm"
                variant="outlined"
                onClick={() => goToUserPage(userPage + 1)}
                disabled={(userPage + 1) * ITEMS_PER_PAGE >= filteredUsers.length}
                className="rounded-xl text-xs font-bold"
              >
                Suivant
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Ban User Modal */}
      <BanUserModal
        isOpen={!!userToBan}
        userEmail={userToBan?.email || ''}
        userName={userToBan?.name}
        userIp={userToBan?.ip}
        onClose={() => setUserToBan(null)}
        onConfirm={handleConfirmBan}
      />

      {/* Flag (suspect) User Modal */}
      <FlagUserModal
        isOpen={!!userToFlag}
        userEmail={userToFlag?.email || ''}
        userName={userToFlag?.name}
        currentReason={userToFlag?.reason}
        onClose={() => setUserToFlag(null)}
        onConfirm={handleConfirmFlag}
        onRemove={userToFlag?.reason ? handleRemoveFlag : undefined}
      />
    </div>
  );
};
