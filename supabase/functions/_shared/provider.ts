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

  return resolveProviderSelection(data?.provider as string | undefined, {
    marcenaria_magica: Boolean(Deno.env.get("MARCENARIA_MAGICA_RENDER_URL") && Deno.env.get("MARCENARIA_MAGICA_RENDER_SECRET")),
    lovable: Boolean(Deno.env.get("LOVABLE_API_KEY")),
    gemini: Boolean(Deno.env.get("GOOGLE_GEMINI_API_KEY") ?? Deno.env.get("GEMINI_API_KEY")),
    vercel: Boolean(Deno.env.get("VERCEL_IMAGE_BRIDGE_URL")),
  }, options);
}
