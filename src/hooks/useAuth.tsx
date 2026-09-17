import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
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

const AUTH_INIT_TIMEOUT_MS = 12_000;
const PROFILE_FETCH_TIMEOUT_MS = 12_000;

const withTimeout = async <T,>(promise: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const isAbortError = (error: unknown) => error instanceof Error && error.name === 'AbortError';

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
  const profileRequestRef = useRef<AbortController | null>(null);

  const loading = authLoading || profileLoading;

  const fetchProfile = async (userId: string) => {
    profileRequestRef.current?.abort();
    const controller = new AbortController();
    profileRequestRef.current = controller;
    setProfileLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, company, phone, avatar_url, onboarding_completed, reduce_motion, onboarding_step, profession')
        .eq('user_id', userId)
        .maybeSingle()
        .abortSignal(controller.signal);

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
        return;
      }

      setProfile(data ?? null);
    } catch (err) {
      if (isAbortError(err)) {
        console.error('Profile hydration timed out or was cancelled.');
      } else {
        console.error('Unexpected error fetching profile:', err);
      }
      setProfile(null);
    } finally {
      if (profileRequestRef.current === controller) {
        profileRequestRef.current = null;
        setProfileLoading(false);
      }
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
      setUser(nextUser);
      if (!nextUser) {
        profileRequestRef.current?.abort();
        setProfile(null);
        setProfileLoading(false);
      }
    });

    const initialize = async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_INIT_TIMEOUT_MS,
          'Auth session initialization',
        );

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
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.error('Auth initialization failed:', err);
          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileLoading(false);
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    void initialize();

    return () => {
      mounted = false;
      profileRequestRef.current?.abort();
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      profileRequestRef.current?.abort();
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    void fetchProfile(user.id);
  }, [user]);

  useEffect(() => {
    if (!profileLoading) return;
    const timeoutId = setTimeout(() => {
      if (profileRequestRef.current) {
        console.error(`Profile hydration exceeded ${PROFILE_FETCH_TIMEOUT_MS}ms; aborting request.`);
        profileRequestRef.current.abort();
      }
    }, PROFILE_FETCH_TIMEOUT_MS);
    return () => clearTimeout(timeoutId);
  }, [profileLoading]);

  const signOut = async () => {
    profileRequestRef.current?.abort();
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
