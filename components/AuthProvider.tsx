'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, getProfile, isSupabaseConfigured } from '@/lib/supabase';
import { getLocalSession, type LocalProfile } from '@/lib/localAuth';

type Profile = { id: string; username: string; avatar_id: string };

interface AuthContextValue {
  /** Unified "is there a logged-in user" — true for Supabase OR local session. */
  user: { id: string } | null;
  profile: Profile | null;
  loading: boolean;
  /** Auth is ALWAYS available now (Supabase if configured, else local accounts). */
  configured: boolean;
  /** true when using the localStorage fallback (no Supabase backend). */
  localMode: boolean;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, profile: null, loading: true, configured: true, localMode: true, refreshProfile: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLocal = useCallback(() => {
    const s = getLocalSession();
    if (s) {
      setUser({ id: s.username });
      setProfile({ id: s.username, username: s.username, avatar_id: s.avatar_id });
    } else {
      setUser(null);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured) {
      // Supabase mode
      supabase.auth.getSession().then(async ({ data }: any) => {
        const u = data.session?.user || null;
        setUser(u ? { id: u.id } : null);
        if (u) { const p = await getProfile(u.id); setProfile(p); }
        setLoading(false);
      });
      const { data: sub } = supabase.auth.onAuthStateChange(async (_e: any, session: any) => {
        const u = session?.user || null;
        setUser(u ? { id: u.id } : null);
        if (u) { const p = await getProfile(u.id); setProfile(p); } else setProfile(null);
      });
      return () => { sub.subscription.unsubscribe(); };
    } else {
      // Local mode
      loadLocal();
      setLoading(false);
      // React to login/logout from other tabs or same-tab events
      const onStorage = () => loadLocal();
      window.addEventListener('storage', onStorage);
      window.addEventListener('vc-auth-changed', onStorage);
      return () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('vc-auth-changed', onStorage);
      };
    }
  }, [loadLocal]);

  const refreshProfile = useCallback(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getUser().then(async ({ data }: any) => {
        if (data.user) { const p = await getProfile(data.user.id); setProfile(p); }
      });
    } else {
      loadLocal();
    }
  }, [loadLocal]);

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      configured: true,                 // auth always available (local fallback)
      localMode: !isSupabaseConfigured,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
