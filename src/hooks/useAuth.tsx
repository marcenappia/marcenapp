import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: { name: string; company: string; phone: string; avatar_url: string; onboarding_completed: string[]; reduce_motion: boolean; onboarding_step: number; profession: string | null } | null;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true, profile: null, profileLoading: false,
  signOut: async () => {}, refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, company, phone, avatar_url, onboarding_completed, reduce_motion, onboarding_step, profession')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
        return;
      }

      setProfile(data ?? null);
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (!nextSession?.user) {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    const initialize = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        console.error('Error restoring auth session:', error);
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
      } else if (data.session?.user) {
        setSession(data.session);
        setUser(data.session.user);
        setProfileLoading(true);
        await fetchProfile(data.session.user.id);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
      }
      if (mounted) setLoading(false);
    };

    void initialize();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    // The initial session path hydrates the profile itself. Auth state changes
    // (login, OAuth callback, refresh) still need an explicit profile fetch.
    if (!profile && !profileLoading) void fetchProfile(user.id);
  }, [user]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
    setUser(null);
    setSession(null);
    setProfile(null);
    setProfileLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, profileLoading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
