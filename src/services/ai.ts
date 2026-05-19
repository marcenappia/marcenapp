import { supabase } from '@/integrations/supabase/client';

/** Returns true if user is logged in, false otherwise */
export const requireAuth = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const aiHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${SUPABASE_KEY}`,
});

export const callAIImage = async (prompt: string, images?: { mimeType: string; data: string }[]) => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-image`, {
    method: "POST",
    headers: aiHeaders(),
    body: JSON.stringify({ prompt, images }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data.imageUrl as string | null;
};

export const callAIText = async (prompt: string, images?: { mimeType: string; data: string }[], jsonMode = false) => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-text`, {
    method: "POST",
    headers: aiHeaders(),
    body: JSON.stringify({ prompt, images, jsonMode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data.text as string;
};
