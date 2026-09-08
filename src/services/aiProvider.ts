import { supabase } from '@/integrations/supabase/client';

export type AIProvider = 'automatic' | 'gemini' | 'lovable';

// MARCENAPP uses Lovable AI as the default runtime provider for now.
// Gemini remains selectable for the future and is not removed from the backend.
const DEFAULT_PROVIDER: AIProvider = 'lovable';

export async function getAIProvider(): Promise<AIProvider> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_PROVIDER;
  const { data } = await supabase
    .from('ai_provider_settings' as never)
    .select('provider')
    .eq('user_id', user.id)
    .maybeSingle();
  const provider = (data as { provider?: AIProvider } | null)?.provider;
  return provider === 'gemini' || provider === 'lovable' || provider === 'automatic' ? provider : DEFAULT_PROVIDER;
}

export async function setAIProvider(provider: AIProvider): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Faça login para configurar o provedor de IA.');
  const { error } = await supabase.from('ai_provider_settings' as never).upsert({ user_id: user.id, provider, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function resolveAIProvider(): Promise<'gemini' | 'lovable'> {
  const provider = await getAIProvider();
  return provider === 'automatic' ? 'lovable' : provider;
}

export function isLovableProviderConfigured(): boolean {
  // The runtime secret lives only in the Edge Function environment.
  // Never infer a provider credential from the browser.
  return true;
}
