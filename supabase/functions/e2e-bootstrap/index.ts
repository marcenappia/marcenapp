import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "marcenapp-e2e";
const REPOSITORY = "marcenappia/marcenapp";
const WORKFLOW = "marcenappia/marcenapp/.github/workflows/playwright.yml@";
const jwks = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

async function authorize(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) throw new Error("Missing GitHub OIDC token");
  const { payload } = await jwtVerify(auth.slice(7), jwks, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (payload.repository !== REPOSITORY) throw new Error("Unauthorized repository");
  if (typeof payload.workflow_ref !== "string" || !payload.workflow_ref.startsWith(WORKFLOW)) {
    throw new Error("Unauthorized workflow");
  }
  return payload;
}

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
);
const publicClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const claims = await authorize(req);
    const body = await req.json().catch(() => ({}));

    if (body?.action === "create") {
      const runId = String(claims.run_id ?? crypto.randomUUID());
      const email = "e2e+" + runId + "@marcenapp.invalid";
      const password = crypto.randomUUID() + "A!9z_" + crypto.randomUUID();

      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { e2e: true, github_run_id: runId },
        });
      if (createError || !created.user) return json({ error: "Unable to create E2E user" }, 500);

      const { data: signedIn, error: signInError } =
        await publicClient.auth.signInWithPassword({ email, password });
      if (signInError || !signedIn.session) {
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: "Unable to create E2E session" }, 500);
      }

      return json({
        user_id: created.user.id,
        session: {
          access_token: signedIn.session.access_token,
          refresh_token: signedIn.session.refresh_token,
          expires_at: signedIn.session.expires_at,
          expires_in: signedIn.session.expires_in,
          token_type: signedIn.session.token_type,
          user: signedIn.session.user,
        },
      });
    }

    if (body?.action === "delete") {
      const userId = typeof body?.user_id === "string" ? body.user_id : "";
      if (!userId) return json({ error: "Missing user_id" }, 400);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: "Unable to delete E2E user" }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unauthorized" }, 401);
  }
});
