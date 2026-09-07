import { supabase } from '@/integrations/supabase/client';

export type AIProvider = 'automatic' | 'gemini' | 'lovable';

const DEFAULT_PROVIDER: AIProvider = 'automatic';

export async function getAIProvider(): Promise<AIProvider> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_PROVIDER;
  const { data } = await supabase
    .from('ai_provider_settings')
    .select('provider')
    .eq('user_id', user.id)
    .maybeSingle();
  const provider = data?.provider as AIProvider | undefined;
  return provider === 'gemini' || provider === 'lovable' || provider === 'automatic' ? provider : DEFAULT_PROVIDER;
}

export async function setAIProvider(provider: AIProvider): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Faça login para configurar o provedor de IA.');
  const { error } = await supabase.from('ai_provider_settings').upsert({ user_id: user.id, provider, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function resolveAIProvider(): Promise<'gemini' | 'lovable'> {
  const provider = await getAIProvider();
  return provider === 'automatic' ? 'gemini' : provider;
}

export function isLovableProviderConfigured(): boolean {
  // A integração Lovable ainda depende de uma credencial/backend connector.
  // Nunca inferimos uma credencial a partir do browser.
  return Boolean(import.meta.env.VITE_LOVABLE_AI_CONFIGURED === 'true');
}
