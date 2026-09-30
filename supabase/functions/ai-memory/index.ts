import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "gte-small";
const MAX_INPUT = 6000;

function cors(request: Request) {
  const origin = request.headers.get("Origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function response(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(request), "Content-Type": "application/json" },
  });
}

async function authenticate(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("unauthorized");

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) throw new Error("server_config_incomplete");

  const client = createClient(url, key, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("unauthorized");
  return { client, userId: data.user.id };
}

const model = new Supabase.ai.Session(MODEL);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(request) });
  if (request.method !== "POST") return response(request, { code: "method_not_allowed" }, 405);

  try {
    const { client, userId } = await authenticate(request);
    const body = await request.json().catch(() => null) as {
      input?: unknown;
      projectId?: unknown;
      messageId?: unknown;
      sourceType?: unknown;
      metadata?: unknown;
      persist?: unknown;
    } | null;

    const input = typeof body?.input === "string" ? body.input.trim() : "";
    if (!input || input.length > MAX_INPUT) {
      return response(request, { code: "invalid_input", message: "Texto inválido para memória." }, 400);
    }

    const embedding = await model.run(input, {
      mean_pool: true,
      normalize: true,
    });

    const persist = body?.persist !== false;
    if (persist) {
      const projectId = typeof body?.projectId === "string" ? body.projectId : null;
      const messageId = typeof body?.messageId === "string" ? body.messageId : null;
      const sourceType = typeof body?.sourceType === "string" ? body.sourceType : "chat_message";
      const metadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};

      const { error } = await client.from("iara_memory_embeddings").insert({
        user_id: userId,
        project_id: projectId,
        message_id: messageId,
        source_type: sourceType,
        content: input,
        metadata,
        embedding,
      });
      if (error) throw new Error("memory_persist_failed");
    }

    return response(request, {
      ok: true,
      provider: "supabase",
      model: MODEL,
      dimensions: Array.isArray(embedding) ? embedding.length : null,
      persisted: persist,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "unauthorized" ? 401 : 500;
    return response(request, {
      ok: false,
      code: message,
      message: message === "memory_persist_failed"
        ? "Não foi possível salvar a memória da IARA."
        : "Não foi possível processar a memória da IARA.",
    }, status);
  }
});
