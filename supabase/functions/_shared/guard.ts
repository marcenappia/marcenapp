// Guarda compartilhada das Edge Functions de IA: CORS restrito, JWT do usuário e rate limit.
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGIN_SUFFIXES = [".lovable.app", ".lovableproject.com", ".lovable.dev"];
const EXTRA_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  try {
    const { hostname, protocol } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    if (protocol !== "https:") return false;
    if (EXTRA_ORIGINS.includes(origin)) return true;
    return ALLOWED_ORIGIN_SUFFIXES.some((s) => hostname.endsWith(s));
  } catch {
    return false;
  }
};

/** Cabeçalhos CORS que refletem apenas origens permitidas. */
export const buildCorsHeaders = (req: Request): Record<string, string> => {
  const origin = req.headers.get("origin");
  const allowed = isAllowedOrigin(origin) ? origin! : "null";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

export const jsonResponse = (
  cors: Record<string, string>,
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, ...extra, "Content-Type": "application/json" },
  });

export interface GuardOptions {
  /** Nome da função — chave do rate limit. */
  fn: string;
  /** Máximo de chamadas por janela. */
  limit: number;
  /** Janela em segundos. */
  windowSeconds: number;
}

export type GuardResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

/**
 * Valida o JWT do usuário (Authorization: Bearer <access_token>) e aplica rate limit por usuário.
 * Retorna a resposta de erro pronta quando bloqueado.
 */
export async function guardRequest(
  req: Request,
  cors: Record<string, string>,
  opts: GuardOptions,
): Promise<GuardResult> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return { ok: false, response: jsonResponse(cors, { error: "Autenticação necessária." }, 401) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("guard: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes");
    return { ok: false, response: jsonResponse(cors, { error: "Configuração do servidor incompleta." }, 500) };
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return { ok: false, response: jsonResponse(cors, { error: "Sessão inválida ou expirada." }, 401) };
  }
  const userId = userData.user.id;

  const { data: rl, error: rlError } = await admin.rpc("consume_ai_rate_limit", {
    _user_id: userId,
    _fn: opts.fn,
    _limit: opts.limit,
    _window_seconds: opts.windowSeconds,
  });

  if (rlError) {
    // Falha no contador não deve derrubar o serviço, mas fica registrada.
    console.error("guard: rate limit rpc error", rlError.message);
    return { ok: true, userId };
  }

  const row = Array.isArray(rl) ? rl[0] : rl;
  if (row && row.allowed === false) {
    const retryAfter = Math.max(1, Number(row.retry_after_seconds ?? opts.windowSeconds));
    return {
      ok: false,
      response: jsonResponse(
        cors,
        { error: `Limite de uso atingido. Tente novamente em ${retryAfter}s.`, retryAfterSeconds: retryAfter },
        429,
        { "Retry-After": String(retryAfter) },
      ),
    };
  }

  return { ok: true, userId };
}

/** Lê o corpo JSON com limite de tamanho. Retorna null se inválido/grande demais. */
export async function readJsonBody(req: Request, maxBytes: number): Promise<{ ok: true; body: unknown } | { ok: false; reason: "too_large" | "invalid_json" }> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return { ok: false, reason: "too_large" };
  const text = await req.text();
  if (text.length > maxBytes) return { ok: false, reason: "too_large" };
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}
