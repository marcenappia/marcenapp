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
  if (configured === "lovable") return { primary: "lovable", fallback: available.gemini ? "gemini" : null };
  if (configured === "gemini") return { primary: "gemini", fallback: available.lovable ? "lovable" : null };
  return {
    primary: available.lovable ? "lovable" : "gemini",
    fallback: available.lovable && available.gemini ? "gemini" : null,
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
