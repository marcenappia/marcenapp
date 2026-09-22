import { createClient } from "npm:@supabase/supabase-js@2";

export type AIProvider = "lovable" | "gemini";

export type ProviderResolution = {
  primary: AIProvider;
  fallback: AIProvider | null;
};

export function resolveProviderSelection(
  configured: string | undefined,
  available: { lovable: boolean; gemini: boolean },
): ProviderResolution {
  const ordered: AIProvider[] =
    configured === "gemini"
      ? ["gemini", "lovable"]
      : configured === "lovable"
        ? ["lovable", "gemini"]
        : ["lovable", "gemini"];

  const eligible = ordered.filter(provider => available[provider]);
  if (!eligible[0]) throw new Error("provider_not_configured");
  return {
    primary: eligible[0],
    fallback: eligible[1] ?? null,
  };
}

export async function resolveProvider(userId: string): Promise<ProviderResolution> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("server_config_incomplete");

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await admin
    .from("ai_provider_settings")
    .select("provider")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("provider_settings_unavailable");

  return resolveProviderSelection(data?.provider as string | undefined, {
    lovable: Boolean(Deno.env.get("LOVABLE_API_KEY")),
    gemini: Boolean(Deno.env.get("GOOGLE_GEMINI_API_KEY")),
  });
}
