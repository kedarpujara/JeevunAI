// src/context/AuthContext.tsx - Updated to manage encryption keys
import {
  broadcastProfileUpdated, ensureDefaultAvatar, ensureUserProfile
} from '@/services/profile';
import { supabase } from '@/services/supabase';
import { EntriesService } from '@/services/entries';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type AuthContextValue = {
  user: User | null;
  isReady: boolean;                    // becomes true once we've checked the initial session
  signIn: (email: string, password: string) => Promise<{ session: Session | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ session: Session | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>; // force-refresh from Supabase (rarely needed)
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function seedProfileFor(user: User) {
  try {
    const displayName =
      (user.user_metadata?.display_name as string | undefined) ?? null;

    // 1) Ensure a user_profiles row exists and capture display_name from metadata on first run.
    const prof = await ensureUserProfile(user.id, user.email ?? null, displayName);

    // 2) If they have no avatar yet, generate and upload a default one once.
    if (!prof.avatar_url) {
      await ensureDefaultAvatar(
        user.id,
        prof.display_name ?? user.email ?? 'User'
      );
    }

    // 3) Let the app (Drawer/Profile etc.) know to refresh immediately.
    broadcastProfileUpdated(user.id);
  } catch (e) {
    if (__DEV__) console.warn('AuthContext: seedProfileFor error', e);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initial bootstrap + subscribe to Supabase auth events
  useEffect(() => {
    let mounted = true;

    (async () => {
      // Initial session check
      const { data } = await supabase.auth.getSession();
      const initialUser = data?.session?.user ?? null;

      if (mounted) {
        setUser(initialUser);
        setIsReady(true);
      }

      // If already signed in when app mounts, seed/repair profile
      if (initialUser) {
        await seedProfileFor(initialUser);
      }
    })();

    // Subscribe to auth state changes from Supabase
    // Events come from supabase-js (e.g., 'SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'TOKEN_REFRESHED')
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);

        if (
          event === 'SIGNED_IN' ||
          event === 'USER_UPDATED' ||
          event === 'TOKEN_REFRESHED'
        ) {
          if (nextUser) await seedProfileFor(nextUser);
        }

        if (event === 'SIGNED_OUT') {
          // Clear encryption keys on sign out for security
          console.log('Clearing encryption keys on logout');
          EntriesService.clearEncryption();
          // Optionally: clear any per-user caches here if you keep them in memory
          // (JournalContext already refetches from DB on mount/when needed)
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  // Public methods
  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;

    // If we received a session instantly (email confirmations disabled), seed profile
    const u = data.session?.user ?? null;
    if (u) await seedProfileFor(u);

    return { session: data.session ?? null };
  };

  const signUp: AuthContextValue['signUp'] = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: (displayName ?? '').trim() || null },
        // emailRedirectTo: 'your://deeplink', // optional
      },
    });
    if (error) throw error;

    // If confirmations are OFF, you'll get a session right away; seed the profile now.
    const u = data.session?.user ?? null;
    if (u) await seedProfileFor(u);

    return { session: data.session ?? null };
  };

  const signOut: AuthContextValue['signOut'] = async () => {
    // Clear encryption keys before signing out for security
    console.log('Clearing encryption keys before logout');
    EntriesService.clearEncryption();
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // user state will be cleared by onAuthStateChange listener
  };

  const refreshSession: AuthContextValue['refreshSession'] = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const next = data?.session?.user ?? null;
    setUser(next);
    if (next) await seedProfileFor(next);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      signIn,
      signUp,
      signOut,
      refreshSession,
    }),
    [user, isReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}