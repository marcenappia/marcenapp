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
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const loading = authLoading || profileLoading;

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
      const nextUser = nextSession?.user ?? null;
      setSession(nextSession);
      setProfileLoading(Boolean(nextUser));
      setUser(nextUser);
      if (!nextUser) setProfile(null);
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
        setProfileLoading(true);
        setUser(data.session.user);
        // Profile hydration is owned by the user effect below. Keeping a
        // single fetch path prevents concurrent initialization races.
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
      }
      setAuthLoading(false);
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
    // Every authenticated user transition hydrates exactly once here.
    void fetchProfile(user.id);
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
