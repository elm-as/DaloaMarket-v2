import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { Session, User } from '@supabase/auth-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { SupabaseContext, type UserProfile } from './supabaseContextTypes';

const isProfileFullyFilled = (profile: UserProfile): boolean => {
  if (!profile) return false;
  const requiredFields = [profile.full_name, profile.phone, profile.district];
  return requiredFields
    .map((v) => (v == null ? '' : typeof v === 'string' ? v : String(v)))
    .every((v) => v.trim().length > 0);
};

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileHydratedUserId, setProfileHydratedUserId] = useState<string | null>(null);
  const isProfileComplete = useMemo(() => isProfileFullyFilled(userProfile), [userProfile]);
  const profileHydrated = useMemo(() => {
    if (!user) return true;
    return profileHydratedUserId === user.id;
  }, [profileHydratedUserId, user]);
  const profileFetchSeq = useRef(0);

  const fetchUserProfile = async (userId: string, email?: string | null) => {
    if (!isSupabaseConfigured) return;
    const requestSeq = ++profileFetchSeq.current;
    setProfileLoading(true);
    try {
      const { data: byIdRaw, error: byIdErrorRaw } = await supabase
        .from('users').select('*').eq('id', userId).maybeSingle();
      const byIdError = byIdErrorRaw as unknown as { code?: string; status?: number } | null;
      const isByIdNotAcceptable = !!byIdError && (byIdError.code === 'PGRST116' || byIdError.status === 406);
      if (byIdErrorRaw && !isByIdNotAcceptable) throw byIdErrorRaw;
      const byId = isByIdNotAcceptable ? null : byIdRaw;

      let data = byId;
      const effectiveEmail = (typeof email === 'string' && email.trim().length > 0) ? email.trim() : null;
      if (data == null && effectiveEmail) {
        const { data: byEmailRows, error: byEmailError } = await supabase
          .from('users').select('*').eq('email', effectiveEmail)
          .order('created_at', { ascending: false }).limit(5);
        if (!byEmailError && Array.isArray(byEmailRows) && byEmailRows.length > 0) {
          const best = (byEmailRows.find((p) => isProfileFullyFilled(p)) ?? byEmailRows[0]) as NonNullable<UserProfile>;
          data = best;
          if (best?.id && best.id !== userId) {
            try {
              const { data: repaired, error: repairError } = await supabase
                .from('users').upsert({
                  id: userId, email: effectiveEmail,
                  full_name: best.full_name ?? null, phone: best.phone ?? null, district: best.district ?? null,
                }, { onConflict: 'id' }).select('*').maybeSingle();
              if (!repairError && repaired) data = repaired;
            } catch (err) { console.error('Error repairing user profile:', err); }
          }
        }
      }

      if (requestSeq === profileFetchSeq.current) {
        setUserProfile((prev) => {
          if (data == null) return (prev && prev.id === userId) ? prev : null;
          if (prev && prev.id === userId && isProfileFullyFilled(prev) && !isProfileFullyFilled(data)) return prev;
          return data;
        });
      }
    } catch (error) {
      console.error('Fetch user profile error:', error);
    } finally {
      if (requestSeq === profileFetchSeq.current) {
        setProfileLoading(false);
        setProfileHydratedUserId(userId);
      }
    }
  };

  const checkSession = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('getSession timed out')), 5000)),
      ]);
      const { data: { session } } = sessionResult;
      if (session) {
        type SessionWithRefresh = Session & { refresh_token?: string; expires_at?: number };
        const s = session as SessionWithRefresh;
        if (!s.refresh_token) {
          const now = Math.floor(Date.now() / 1000);
          if ((s.expires_at ?? 0) && (s.expires_at ?? 0) <= now) {
            try { await supabase.auth.signOut(); } catch (err) { console.error('Error signing out expired session:', err); }
            setSession(null); setUser(null); setUserProfile(null); setLoading(false); return;
          }
        }
      }
      setSession(session);
      setUser(session?.user ?? null);
      setProfileHydratedUserId(session?.user?.id ?? null);
      if (session?.user) await fetchUserProfile(session.user.id, session.user.email ?? null);
      else { setUserProfile(null); setProfileLoading(false); }
    } catch (err) { console.error('Error checking session:', err); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        type SessionWithRefresh = Session & { refresh_token?: string; expires_at?: number };
        const s = session as SessionWithRefresh;
        if (!s.refresh_token) {
          const now = Math.floor(Date.now() / 1000);
          if ((s.expires_at ?? 0) && (s.expires_at ?? 0) <= now) {
            try { await supabase.auth.signOut(); } catch (err) { console.error('Error signing out expired session:', err); }
            setSession(null); setUser(null); setUserProfile(null); return;
          }
        }
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setProfileHydratedUserId(null);
        fetchUserProfile(session.user.id, session.user.email ?? null);
      } else { setUserProfile(null); setProfileHydratedUserId(null); setProfileLoading(false); }
    });
    checkSession();
    const timeout = setTimeout(() => setLoading((prev) => prev ? false : prev), 8000);
    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, [checkSession]);

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured) return { error: new Error('Supabase not configured.') };
    try { const res = await supabase.auth.signUp({ email, password }); return { error: res.error, session: res.data?.session ?? null }; }
    catch (error) { return { error }; }
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) return { error: new Error('Supabase not configured.') };
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      const sessionReturned = res.data?.session ?? null;
      if (sessionReturned) {
        type SessionWithRefresh = Session & { refresh_token?: string };
        if (!(sessionReturned as SessionWithRefresh).refresh_token) {
          try { await supabase.auth.signOut(); } catch (err) { console.error('Error signing out invalid session:', err); }
          return { error: new Error('Session invalide: token de rafraîchissement manquant. Veuillez confirmer votre email ou réessayer.') };
        }
      }
      return { error: res.error };
    } catch (error) { return { error }; }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return { error: new Error('Supabase not configured.') };
    try { const { error } = await supabase.auth.signOut(); return { error }; }
    catch (error) { return { error }; }
  };

  const createUserProfile = async (profile: Omit<Database['public']['Tables']['users']['Insert'], 'id'>) => {
    if (!isSupabaseConfigured) return { error: new Error('Supabase not configured.') };
    try {
      if (!user) return { error: new Error('User not authenticated') };
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { error: new Error('Session invalide. Veuillez vous reconnecter ou confirmer votre adresse email.') };
      type SessionWithRefresh = Session & { refresh_token?: string; expires_at?: number };
      const s = session as SessionWithRefresh;
      if (!s.refresh_token) {
        const now = Math.floor(Date.now() / 1000);
        if ((s.expires_at ?? 0) && (s.expires_at ?? 0) <= now) return { error: new Error('Session expiree. Veuillez vous reconnecter.') };
      }
      // Filtrer user_id qui n'existe pas dans public.users (champ fantome du type Insert)
      const cleanProfile = Object.fromEntries(Object.entries(profile).filter(([k]) => k !== 'user_id'));
      // Le trigger handle_new_user créé déjà la ligne → on fait un update, pas un upsert (évite un 400 PostgREST)
      const { error } = await supabase.from('users').update(cleanProfile as Database['public']['Tables']['users']['Update']).eq('id', user.id);
      if (!error) await fetchUserProfile(user.id);
      return { error };
    } catch (error) { return { error }; }
  };

  const updateUserProfile = async (profile: Partial<Database['public']['Tables']['users']['Update']>) => {
    if (!isSupabaseConfigured) return { error: new Error('Supabase not configured.') };
    try {
      if (!user) return { error: new Error('User not authenticated') };
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { error: new Error('Session invalide. Veuillez vous reconnecter.') };
      type SessionWithRefresh2 = Session & { refresh_token?: string; expires_at?: number };
      const s2 = session as SessionWithRefresh2;
      if (!s2.refresh_token) {
        const now = Math.floor(Date.now() / 1000);
        if ((s2.expires_at ?? 0) && (s2.expires_at ?? 0) <= now) return { error: new Error('Session expiree.') };
      }

      const { data: dataRaw, error: errorRaw } = await supabase
        .from('users').update({ ...profile }).eq('id', user.id).select('*').maybeSingle();
      let data = dataRaw;
      let error = errorRaw as unknown as { code?: string; status?: number } | null;
      if (!!error && (error.code === 'PGRST116' || error.status === 406)) { data = null; error = null; }

      if (!error && data == null) {
        const emailFromProfile = typeof profile.email === 'string' ? profile.email : (user.email || '');
        const { data: upserted, error: upsertError } = await supabase
          .from('users').upsert({
            id: user.id, email: emailFromProfile,
            full_name: (profile.full_name ?? null) as string | null,
            phone: (profile.phone ?? null) as string | null,
            district: (profile.district ?? null) as string | null,
          }, { onConflict: 'id' }).select('*').maybeSingle();
        if (upsertError) return { error: upsertError };
        if (upserted) { setUserProfile(upserted); await fetchUserProfile(user.id); return { error: null }; }
      }

      if (!error) {
        setUserProfile((prev) => {
          if (!prev) return { id: user.id, email: user.email || '', phone: (profile.phone ?? null) as string | null, full_name: (profile.full_name ?? null) as string | null, district: (profile.district ?? null) as string | null, created_at: new Date().toISOString(), rating: null, first_listing_at: null, banned: false, role: 'user' } as Database['public']['Tables']['users']['Row'];
          return { ...prev, ...(profile as Partial<Database['public']['Tables']['users']['Row']>) };
        });
        if (data) {
          setUserProfile((prev) => {
            if (prev && prev.id === user.id && isProfileFullyFilled(prev) && !isProfileFullyFilled(data)) return prev;
            return data;
          });
        }
        await fetchUserProfile(user.id);
      }
      return { error };
    } catch (error) { return { error }; }
  };

  const refreshUserProfile = async () => {
    if (user && isSupabaseConfigured) await fetchUserProfile(user.id, user.email ?? null);
  };

  // DEBUG: Temporaire - pour diagnostiquer le problème admin
  if (userProfile) {
    console.log('[DEBUG AdminCheck] userProfile.role =', userProfile.role, '| userProfile.id =', userProfile.id);
  }

  const ALLOWED_ADMIN_ROLES = ['superadmin', 'admin', 'moderateur', 'helper'];
  const isAdmin = userProfile?.role ? ALLOWED_ADMIN_ROLES.includes(userProfile.role.toLowerCase()) : false;

  const value = { session, user, userProfile, loading, profileLoading, profileHydrated, isProfileComplete, isAdmin, signUp, signIn, signOut, createUserProfile, updateUserProfile, refreshUserProfile };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
};