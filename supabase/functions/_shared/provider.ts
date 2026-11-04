import { createClient } from "npm:@supabase/supabase-js@2";

export type AIProvider = "marcenaria_magica" | "lovable" | "gemini" | "vercel";

export type ProviderAvailability = {
  marcenaria_magica: boolean;
  lovable: boolean;
  gemini: boolean;
  vercel: boolean;
};

export type ProviderResolution = {
  primary: AIProvider;
  fallback: AIProvider | null;
};

/**
 * The Marcenaria Mágica engine runs natively inside the ai-image function on
 * the AI gateway, so the existing LOVABLE_API_KEY enables both the engine and
 * the generic Lovable adapter. No extra secret or external URL is required.
 */
export function providerAvailabilityFromEnv(
  readEnv: (name: string) => string | undefined = (name) => Deno.env.get(name),
): ProviderAvailability {
  const lovable = Boolean(readEnv("LOVABLE_API_KEY"));
  return {
    marcenaria_magica: lovable,
    lovable,
    gemini: Boolean(readEnv("GOOGLE_GEMINI_API_KEY") ?? readEnv("GEMINI_API_KEY")),
    vercel: Boolean(readEnv("VERCEL_IMAGE_BRIDGE_URL")),
  };
}

export function resolveProviderSelection(
  configured: string | undefined,
  available: ProviderAvailability,
  options?: { requiresReference?: boolean },
): ProviderResolution {
  const operational: AIProvider[] = [
    ...(available.marcenaria_magica && options?.requiresReference !== false ? ["marcenaria_magica" as const] : []),
    ...(available.vercel && options?.requiresReference !== false ? ["vercel" as const] : []),
    ...(available.lovable ? ["lovable" as const] : []),
    ...(available.gemini ? ["gemini" as const] : []),
  ];

  if (operational.length === 0) throw new Error("PROVIDER_NOT_CONFIGURED");

  if (configured === "marcenaria_magica" || configured === "lovable" || configured === "gemini" || configured === "vercel") {
    if (configured === "marcenaria_magica" && options?.requiresReference === false) throw new Error("PROVIDER_NOT_CONFIGURED");
    if (!available[configured]) throw new Error("PROVIDER_NOT_CONFIGURED");
    const fallback = operational.find((provider) => provider !== configured) ?? null;
    return { primary: configured, fallback };
  }

  return {
    primary: operational[0],
    fallback: operational[1] ?? null,
  };
}

export async function resolveProvider(userId: string, options?: { requiresReference?: boolean }): Promise<ProviderResolution> {
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

  return resolveProviderSelection(data?.provider as string | undefined, providerAvailabilityFromEnv(), options);
}
