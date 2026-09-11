import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Production Supabase client: no Lovable preview bridge, no editor messaging,
// and no legacy preview storage. Authentication belongs entirely to Marcenapp.
// Auth rebuild checkpoint: production uses only the official Supabase client storage.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://uzhqhieqlcyncelltfjw.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_o9A9xyvRYXt-Rl9MZfdArA_SdYOAySX';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
