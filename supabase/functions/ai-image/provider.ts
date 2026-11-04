import { createClient } from "npm:@supabase/supabase-js@2";

export type AIProvider = "marcenaria_magica" | "lovable" | "vercel" | "gemini";

export type ProviderAvailability = {
  marcenaria_magica: boolean;
  lovable: boolean;
  vercel: boolean;
  gemini: boolean;
};

// Marcenaria Mágica is the specialized render engine and takes priority for
// reference renders. The remaining order matches the generic providers.
const PROVIDER_ORDER: AIProvider[] = ["marcenaria_magica", "lovable", "vercel", "gemini"];

export type ProviderResolution = {
  primary: AIProvider;
  fallback: AIProvider | null;
};

export function resolveProviderSelection(
  configured: string | undefined,
  available: ProviderAvailability,
  options: { requiresReference?: boolean } = {},
): ProviderResolution {
  // Every adapter used by ai-image accepts a reference image, but the
  // Marcenaria Mágica engine only runs as a photo edit.
  const operational: AIProvider[] = PROVIDER_ORDER.filter(
    (provider) => available[provider] && (options.requiresReference || provider !== "marcenaria_magica"),
  );

  if (operational.length === 0) throw new Error("PROVIDER_NOT_CONFIGURED");

  if (configured === "marcenaria_magica" || configured === "lovable" || configured === "vercel" || configured === "gemini") {
    if (!operational.includes(configured)) {
      // A provider explicitly selected by the user is a hard contract.
      // Never silently jump to another provider: that can turn a missing
      // credential/quota into a long, misleading render "processing" state.
      throw new Error(`configured_provider_unavailable:${configured}`);
    }
    // Never replay a denied or failed request through a different provider.
    return {
      primary: configured,
      fallback: null,
    };
  }

  return {
    primary: operational[0],
    fallback: null,
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
  const missingTable = (error: { code?: string } | null) => error?.code === "42P01" || error?.code === "PGRST205";
  const { data: userSettings, error: userError } = await admin.from("ai_provider_settings").select("provider").eq("user_id", userId).maybeSingle();
  if (userError && !missingTable(userError)) throw new Error("provider_settings_unavailable");
  const { data, error } = await admin
    .from("ai_runtime_settings")
    .select("provider")
    .eq("id", "default")
    .maybeSingle();
  if (error && !missingTable(error)) throw new Error("provider_settings_unavailable");

  console.info("[PROVIDER_CONFIG]", JSON.stringify({ marcenariaMagica: Boolean(Deno.env.get("LOVABLE_API_KEY")), lovable: Boolean(Deno.env.get("LOVABLE_API_KEY")), gemini: Boolean(Deno.env.get("GOOGLE_GEMINI_API_KEY") || Deno.env.get("GEMINI_API_KEY")), vercelBridge: Boolean(Deno.env.get("VERCEL_IMAGE_BRIDGE_URL")) }));
  return resolveProviderSelection(
    (userSettings?.provider ?? data?.provider) as string | undefined,
    {
      // The native Marcenaria Mágica engine uses the existing gateway credential.
      marcenaria_magica: Boolean(Deno.env.get("LOVABLE_API_KEY")),
      lovable: Boolean(Deno.env.get("LOVABLE_API_KEY")),
      // Image inference is routed through the Vercel deployment bridge, which
      // authenticates to AI Gateway with the deployment OIDC token.
      vercel: Boolean(Deno.env.get("VERCEL_IMAGE_BRIDGE_URL")) || userSettings?.provider === "vercel" || data?.provider === "vercel",
      gemini: Boolean(Deno.env.get("GOOGLE_GEMINI_API_KEY") ?? Deno.env.get("GEMINI_API_KEY")),
    },
    { requiresReference: options.requiresReference },
  );
}
