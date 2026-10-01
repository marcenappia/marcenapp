import { createClient } from "npm:@supabase/supabase-js@2";

export type AIProvider = "lovable" | "vercel" | "gemini";

export type ProviderAvailability = {
  lovable: boolean;
  vercel: boolean;
  gemini: boolean;
};

export type ProviderResolution = {
  primary: AIProvider;
  fallback: AIProvider | null;
};

export function resolveProviderSelection(
  configured: string | undefined,
  available: ProviderAvailability,
  options: { requiresReference?: boolean } = {},
): ProviderResolution {
  // All three adapters used by ai-image can accept a reference image in the
  // current implementation. Keep the capability in the resolver so future
  // providers can opt out without changing the IARA flow.
  const supportsReference: Record<AIProvider, boolean> = {
    lovable: true,
    vercel: true,
    gemini: true,
  };

  const operational: AIProvider[] = [
    ...(available.lovable ? ["lovable" as const] : []),
    ...(available.vercel ? ["vercel" as const] : []),
    ...(available.gemini ? ["gemini" as const] : []),
  ].filter((provider) => !options.requiresReference || supportsReference[provider]);

  if (operational.length === 0) throw new Error("PROVIDER_NOT_CONFIGURED");

  if (configured === "lovable" || configured === "vercel" || configured === "gemini") {
    if (available[configured] && (!options.requiresReference || supportsReference[configured])) {
      const fallback = operational.find((provider) => provider !== configured) ?? null;
      return { primary: configured, fallback };
    }

    const fallbackPrimary = operational[0];
    if (!fallbackPrimary) throw new Error("PROVIDER_NOT_CONFIGURED");
    return {
      primary: fallbackPrimary,
      fallback: operational.find((provider) => provider !== fallbackPrimary) ?? null,
    };
  }

  return {
    primary: operational[0],
    fallback: operational[1] ?? null,
  };
}

export async function resolveProvider(
  userId: string,
  options: { requiresReference?: boolean } = {},
): Promise<ProviderResolution> {
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

  return resolveProviderSelection(
    data?.provider as string | undefined,
    {
      lovable: Boolean(Deno.env.get("LOVABLE_API_KEY")),
      vercel: Boolean(Deno.env.get("AI_GATEWAY_API_KEY") && Deno.env.get("VERCEL_AI_IMAGE_MODEL") || Deno.env.get("AI_GATEWAY_API_KEY")),
      gemini: Boolean(Deno.env.get("GOOGLE_GEMINI_API_KEY") ?? Deno.env.get("GEMINI_API_KEY")),
    },
    { requiresReference: options.requiresReference },
  );
}
