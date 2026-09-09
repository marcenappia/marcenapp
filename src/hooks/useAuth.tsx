import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, supabaseConfigured } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: { name: string; company: string; phone: string; avatar_url: string; onboarding_completed: string[]; reduce_motion: boolean; onboarding_step: number } | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, session: null, loading: true, profile: null, signOut: async () => {}, refreshProfile: async () => {} });
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('name, company, phone, avatar_url, onboarding_completed, reduce_motion, onboarding_step').eq('user_id', userId).maybeSingle();
      if (error) { console.error('Error fetching profile:', error); return; }
      if (data) setProfile(data);
    } catch (err) { console.error('Unexpected error fetching profile:', err); }
  };
  const refreshProfile = async () => { if (user) await fetchProfile(user.id); };

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return; }
    let mounted = true;
    const applySession = (nextSession: Session | null) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
      if (nextSession?.user) void fetchProfile(nextSession.user.id); else setProfile(null);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => applySession(nextSession));
    void supabase.auth.getSession().then(({ data: { session: nextSession }, error }) => {
      if (error) console.error('Error restoring auth session:', error);
      applySession(nextSession);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setSession(null); setProfile(null); };
  return <AuthContext.Provider value={{ user, session, loading, profile, signOut, refreshProfile }}>{children}</AuthContext.Provider>;
};
