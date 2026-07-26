import { createContext, useContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

export type UserProfile = Database['public']['Tables']['users']['Row'] | null;

export interface SupabaseContextType {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile;
  loading: boolean;
  profileLoading: boolean;
  profileHydrated: boolean;
  isProfileComplete: boolean;
  isAdmin: boolean;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: unknown; requiresConfirmation?: boolean; session?: Session | null }>;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signOut: () => Promise<{ error: unknown }>;
  createUserProfile: (
    profile: Omit<Database['public']['Tables']['users']['Insert'], 'id'>
  ) => Promise<{ error: unknown }>;
  updateUserProfile: (
    profile: Partial<Database['public']['Tables']['users']['Update']>
  ) => Promise<{ error: unknown }>;
  refreshUserProfile: () => Promise<void>;
}

export const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const useSupabase = (): SupabaseContextType => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};
