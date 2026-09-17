import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const PROFILE_FETCH_TIMEOUT_MS = 10000;

export const useAuth = () => {
  // Existing implementation intentionally retained; this patch only removes
  // the unsupported PostgREST abortSignal call while keeping the timeout race.
  const [user, setUser] = useState<Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']>(null);
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const profileRequestRef = useRef<AbortController | null>(null);

  const fetchProfile = async (userId: string) => {
    profileRequestRef.current?.abort();
    const controller = new AbortController();
    profileRequestRef.current = controller;
    setProfileLoading(true);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const profileRequest = supabase
        .from('profiles')
        .select('name, company, phone, avatar_url, onboarding_completed, reduce_motion, onboarding_step, profession')
        .eq('user_id', userId)
        .maybeSingle();

      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          console.error(`Profile hydration exceeded ${PROFILE_FETCH_TIMEOUT_MS}ms; aborting request.`);
          controller.abort();
          reject(new Error(`Profile hydration timed out after ${PROFILE_FETCH_TIMEOUT_MS}ms`));
        }, PROFILE_FETCH_TIMEOUT_MS);
      });

      const { data, error } = await Promise.race([profileRequest, timeout]);
      if (error) throw error;
      if (!controller.signal.aborted) setProfile(data);
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('Failed to hydrate profile:', error);
        setProfile(null);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (profileRequestRef.current === controller) {
        profileRequestRef.current = null;
        setProfileLoading(false);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setAuthLoading(false);
      if (currentSession?.user) void fetchProfile(currentSession.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setAuthLoading(false);
      if (currentSession?.user) void fetchProfile(currentSession.user.id);
      else setProfile(null);
    });

    return () => {
      mounted = false;
      profileRequestRef.current?.abort();
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };
  const refreshProfile = async () => { if (user) await fetchProfile(user.id); };
  const loading = authLoading || profileLoading;

  return { user, session, loading, profile, profileLoading, signOut, refreshProfile };
};
