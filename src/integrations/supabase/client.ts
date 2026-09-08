import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// The public Supabase URL/key are safe to ship to the browser. Environment
// variables remain the preferred override, while these production defaults
// keep the hosted preview/login usable when the hosting platform does not
// inject VITE_* variables into the build.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://uzhqhieqlcyncelltfjw.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_o9A9xyvRYXt-Rl9MZfdArA_SdYOAySX';

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
