import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGIN_SUFFIXES = [".vercel.app"];
const EXTRA_ORIGINS = [
  "https://marcenapp.com.br",
  ...(Deno.env.get("ALLOWED_ORIGINS") ?? "").split(","),
  Deno.env.get("APP_URL") ?? "",
  Deno.env.get("PUBLIC_APP_URL") ?? "",
].map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);

const isAllowedOrigin = (origin: string | null) => {
  if (!origin) return false;
  try {
    const { hostname, protocol } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    if (protocol !== "https:") return false;
    const normalized = origin.replace(/\/$/, "");
    if (EXTRA_ORIGINS.includes(normalized)) return true;
    return ALLOWED_ORIGIN_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
  } catch {
    return false;
  }
};

export const buildCorsHeaders = (req: Request): Record<string, string> => {
  const origin = req.headers.get("origin");
  const allowed = isAllowedOrigin(origin) ? origin! : "null";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-retry-count, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, traceparent, tracestate, baggage",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
};

export const jsonResponse = (
  cors: Record<string, string>,
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, ...extra, "Content-Type": "application/json" },
});

export async function guardRequest(req: Request, cors: Record<string, string>, opts: { fn: string; limit: number; windowSeconds: number }) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return { ok: false as const, response: jsonResponse(cors, { error: "Autenticação necessária." }, 401) };

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("guard: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes");
    return { ok: false as const, response: jsonResponse(cors, { error: "Configuração do servidor incompleta." }, 500) };
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) return { ok: false as const, response: jsonResponse(cors, { error: "Sessão inválida ou expirada." }, 401) };

  const { data: rl, error: rlError } = await admin.rpc("consume_ai_rate_limit", {
    _user_id: userData.user.id,
    _fn: opts.fn,
    _limit: opts.limit,
    _window_seconds: opts.windowSeconds,
  });

  if (rlError) {
    console.error("guard: rate limit rpc error", rlError.message);
    return { ok: false as const, response: jsonResponse(cors, { error: "Não foi possível validar o limite de uso da IA.", code: "rate_limit_unavailable" }, 503, { "Retry-After": "10" }) };
  }

  const row = Array.isArray(rl) ? rl[0] : rl;
  if (!row || row.allowed === false) {
    const retry = Math.max(1, Number(row?.retry_after_seconds ?? opts.windowSeconds));
    return { ok: false as const, response: jsonResponse(cors, { error: row ? `Limite de uso atingido. Tente novamente em ${retry}s.` : "Não foi possível validar o limite de uso da IA.", retryAfterSeconds: retry }, 429, { "Retry-After": String(retry) }) };
  }

  return { ok: true as const, userId: userData.user.id };
}

export async function readJsonBody(req: Request, maxBytes: number) {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return { ok: false as const, reason: "too_large" as const };
  const text = await req.text();
  if (text.length > maxBytes) return { ok: false as const, reason: "too_large" as const };
  try { return { ok: true as const, body: JSON.parse(text) }; }
  catch { return { ok: false as const, reason: "invalid_json" as const };
}
