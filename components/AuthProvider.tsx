'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, getProfile, isSupabaseConfigured } from '@/lib/supabase';

type Profile = { id: string; username: string; avatar_id: string };

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, profile: null, loading: true, configured: false, refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (u: User | null) => {
    if (!u) { setProfile(null); return; }
    const p = await getProfile(u.id);
    setProfile(p);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }

    supabase.auth.getSession().then(async ({ data }) => {
      setUser(data.session?.user || null);
      await loadProfile(data.session?.user || null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      setUser(session?.user || null);
      await loadProfile(session?.user || null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const refreshProfile = async () => loadProfile(user);

  return (
    <AuthContext.Provider value={{ user, profile, loading, configured: isSupabaseConfigured, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
