import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://marcenapp.com.br",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function authenticate(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("server_config_incomplete");
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", data.user.id).maybeSingle();
  if (role?.role !== "admin") return null;
  return { admin, userId: data.user.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (!["GET", "POST"].includes(req.method)) return json({ error: "method_not_allowed" }, 405);

  try {
    const auth = await authenticate(req);
    if (!auth) return json({ error: "admin_auth_required" }, 401);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "verify";

    if (action === "verify") {
      const { data: rules } = await auth.admin
        .from("billing_credit_rules")
        .select("operation_type,enabled,credit_cost,version")
        .in("operation_type", ["gerarRender", "calcularOrcamento", "gerarPlanoCorte", "gerarContrato"]);
      const { count: projectCount } = await auth.admin.from("projects").select("id", { count: "exact", head: true });
      return json({ ok: true, projectCount, billingRules: rules ?? [] });
    }

    if (action === "validate-project") {
      const projectId = url.searchParams.get("projectId");
      if (!projectId) return json({ error: "projectId_required" }, 400);
      const { data: project, error: projectError } = await auth.admin
        .from("projects")
        .select("id,user_id,cliente_id,created_at,updated_at")
        .eq("id", projectId)
        .maybeSingle();
      if (projectError) throw projectError;
      if (!project) return json({ error: "project_not_found" }, 404);

      const [{ data: environments }, { data: plans }, { data: stages }, { data: sales }, { data: contracts }] = await Promise.all([
        auth.admin.from("project_environments").select("id,name,type,metadata").eq("project_id", projectId),
        auth.admin.from("project_plans").select("id,status,created_at,updated_at").eq("project_id", projectId),
        auth.admin.from("project_production_stages").select("id,stage,status,position").eq("project_id", projectId),
        auth.admin.from("project_sales").select("id,status,total_amount").eq("project_id", projectId),
        auth.admin.from("project_contracts").select("id,status,created_at").eq("project_id", projectId),
      ]);

      const { data: gallery } = await auth.admin.from("gallery_images").select("id,storage_path,project_id,created_at").eq("project_id", projectId);
      return json({
        ok: true,
        project: { id: project.id, clientLinked: Boolean(project.cliente_id) },
        obra: {
          environments: environments?.length ?? 0,
          budgetPlans: plans?.length ?? 0,
          productionStages: stages?.length ?? 0,
          sales: sales?.length ?? 0,
          contracts: contracts?.length ?? 0,
          renders: gallery?.filter(item => Boolean(item.storage_path)).length ?? 0,
        },
      });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (error) {
    console.error("[MIGRATE_HELPER]", error);
    return json({ error: "internal_error" }, 500);
  }
});
