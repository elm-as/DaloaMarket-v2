import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import type {
  AdminDeliveryPersonSummary,
  AdminRejoinFlag,
  AdminUserCounts,
  AdminUserRecord,
  PlatformFilter,
} from './adminUsers.types';

export const ADMIN_USERS_PER_PAGE = 50;

interface BanTarget {
  id: string;
  email: string;
  name?: string | null;
  ip?: string | null;
}

interface FlagTarget {
  id: string;
  email: string;
  name?: string | null;
  reason?: string | null;
}

function matchesSearchQuery(user: AdminUserRecord, query: string): boolean {
  if (!query) return true;
  return Boolean(
    user.full_name?.toLowerCase().includes(query) ||
      user.delivery_person?.name?.toLowerCase().includes(query) ||
      user.delivery_person?.phone?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.phone?.toLowerCase().includes(query) ||
      user.last_ip?.toLowerCase().includes(query) ||
      user.shop_name?.toLowerCase().includes(query)
  );
}

function matchesPlatform(user: AdminUserRecord, filter: PlatformFilter): boolean {
  switch (filter) {
    case 'market_only':
      return user.isMarketOnly;
    case 'delivery':
      return user.isDelivery;
    case 'both':
      return user.isBoth;
    case 'banned':
      return Boolean(user.banned);
    case 'appeals':
      return user.ban_appeal_status === 'pending';
    case 'suspect':
      return Boolean(user.suspect);
    case 'deleted':
      return Boolean(user.deleted_at);
    case 'rejoins':
      return Boolean(user.rejoin);
    default:
      return true;
  }
}

async function fetchAuxiliaryUserMaps(userIds: string[]) {
  const deliveryMap = new Map<string, AdminDeliveryPersonSummary>();
  const listingCountMap = new Map<string, number>();
  const rejoinMap = new Map<string, AdminRejoinFlag>();
  if (userIds.length === 0) return { deliveryMap, listingCountMap, rejoinMap };

  const [deliveryRes, listingsRes, rejoinRes] = await Promise.allSettled([
    (supabase as any)
      .from('delivery_persons')
      .select('id, user_id, name, phone, is_available, is_verified, vehicle_type, created_at, payout_network'),
    supabase.from('listings').select('user_id'),
    (supabase as any)
      .from('account_rejoin_flags')
      .select('new_user_id, previous_user_id, matched_kind, auto_banned, auto_suspect, previous_state, created_at'),
  ]);

  if (deliveryRes.status === 'fulfilled' && Array.isArray(deliveryRes.value.data)) {
    deliveryRes.value.data.forEach((dp: AdminDeliveryPersonSummary) => deliveryMap.set(dp.user_id, dp));
  }
  if (listingsRes.status === 'fulfilled' && Array.isArray(listingsRes.value.data)) {
    listingsRes.value.data.forEach((l: { user_id: string }) => {
      listingCountMap.set(l.user_id, (listingCountMap.get(l.user_id) || 0) + 1);
    });
  }
  if (rejoinRes.status === 'fulfilled' && Array.isArray(rejoinRes.value.data)) {
    rejoinRes.value.data.forEach((r: AdminRejoinFlag) => rejoinMap.set(r.new_user_id, r));
  }

  return { deliveryMap, listingCountMap, rejoinMap };
}

export function useAdminUsers() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<AdminUserRecord[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [userPage, setUserPage] = useState(0);
  const [resettingUser, setResettingUser] = useState<string | null>(null);
  const [userToBan, setUserToBan] = useState<BanTarget | null>(null);
  const [userToFlag, setUserToFlag] = useState<FlagTarget | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: usersData, error: fetchErr } = await supabase
        .from('users_private')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2000);

      if (fetchErr) throw fetchErr;
      const rawUsers = (usersData || []) as Array<Record<string, any> & { id: string }>;
      const userIds = rawUsers.map((u) => u.id).filter(Boolean);
      const { deliveryMap, listingCountMap, rejoinMap } = await fetchAuxiliaryUserMaps(userIds);

      const merged: AdminUserRecord[] = rawUsers.map((u) => {
        const deliveryData = deliveryMap.get(u.id) || null;
        const listingsCount = listingCountMap.get(u.id) || 0;
        const hasDelivery = Boolean(deliveryData) || u.role === 'livreur' || u.app_origin === 'delivery';
        const hasMarket = listingsCount > 0 || Boolean(u.shop_name) || u.role === 'pro' || u.role === 'seller';
        const isBoth = hasDelivery && hasMarket;
        const isMarket = !hasDelivery || hasMarket;
        const accountName = (u.full_name || '').trim();
        const driverName = (deliveryData?.name || '').trim();

        return {
          ...(u as unknown as AdminUserRecord),
          delivery_person: deliveryData,
          listings_count: listingsCount,
          isDelivery: hasDelivery,
          isMarket,
          isBoth,
          isDeliveryOnly: hasDelivery && !isBoth,
          isMarketOnly: isMarket && !isBoth,
          rejoin: rejoinMap.get(u.id) || null,
          displayName: accountName || driverName || null,
          displayNameFromDriver: !accountName && Boolean(driverName),
        };
      });

      setAllUsers(merged);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur chargement utilisateurs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setUserPage(0);
  }, [userSearch, platformFilter]);

  const handleConfirmBan = async (reason: string, banIpAlso: boolean) => {
    if (!userToBan) return;
    const { error: err } = await supabase
      .from('users')
      .update({ banned: true, ban_reason: reason } as any)
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
        console.warn('[AdminUsers] Impossible de bannir IP:', ipErr);
      }
    }

    toast.success('Utilisateur banni avec succès');
    fetchUsers();
  };

  const handleUnban = async (userId: string) => {
    const { error: err } = await supabase
      .from('users')
      .update({ banned: false, ban_reason: null, ban_appeal_status: null, ban_appeal_reason: null } as any)
      .eq('id', userId);

    if (err) {
      toast.error('Erreur lors du débannissement');
      return;
    }
    toast.success('Utilisateur débanni avec succès');
    fetchUsers();
  };

  const handleConfirmFlag = async (reason: string) => {
    if (!userToFlag) return;
    const { error: err } = await supabase
      .from('users')
      .update({ suspect: true, suspect_reason: reason, suspect_at: new Date().toISOString() } as any)
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
      if (data?.success === false) throw new Error(data.message || 'Erreur réinitialisation');
      toast.success("Compteur d'annulations réinitialisé (0)");
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la réinitialisation');
    } finally {
      setResettingUser(null);
    }
  };

  const changeRole = async (userId: string, newRole: string) => {
    const { error: err } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
    if (err) {
      toast.error('Erreur lors du changement de rôle');
      return;
    }
    toast.success(`Rôle mis à jour : ${newRole}`);
    fetchUsers();
  };

  const filteredUsers = useMemo(() => {
    const query = userSearch.toLowerCase().trim();
    return allUsers.filter((u) => matchesSearchQuery(u, query) && matchesPlatform(u, platformFilter));
  }, [allUsers, userSearch, platformFilter]);

  const paginatedUsers = useMemo(() => {
    const from = userPage * ADMIN_USERS_PER_PAGE;
    return filteredUsers.slice(from, from + ADMIN_USERS_PER_PAGE);
  }, [filteredUsers, userPage]);

  const counts = useMemo<AdminUserCounts>(() => {
    const next: AdminUserCounts = {
      allCount: allUsers.length,
      marketCount: 0,
      deliveryCount: 0,
      bothCount: 0,
      bannedCount: 0,
      appealCount: 0,
      suspectCount: 0,
      deletedCount: 0,
      rejoinCount: 0,
    };
    allUsers.forEach((u) => {
      if (u.isMarketOnly) next.marketCount++;
      if (u.isDelivery) next.deliveryCount++;
      if (u.isBoth) next.bothCount++;
      if (u.banned) next.bannedCount++;
      if (u.ban_appeal_status === 'pending') next.appealCount++;
      if (u.suspect) next.suspectCount++;
      if (u.deleted_at) next.deletedCount++;
      if (u.rejoin) next.rejoinCount++;
    });
    return next;
  }, [allUsers]);

  return {
    loading,
    error,
    allUsers,
    filteredUsers,
    paginatedUsers,
    counts,
    userSearch,
    setUserSearch,
    platformFilter,
    setPlatformFilter,
    userPage,
    setUserPage,
    resettingUser,
    userToBan,
    setUserToBan,
    userToFlag,
    setUserToFlag,
    fetchUsers,
    handleConfirmBan,
    handleUnban,
    handleConfirmFlag,
    handleRemoveFlag,
    handleResetCancellations,
    changeRole,
  };
}
