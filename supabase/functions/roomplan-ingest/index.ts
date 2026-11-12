import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const BodySchema = z.object({
  scanId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  projectName: z.string().trim().max(160).optional(),
  source: z.literal("roomplan").default("roomplan"),
  capturedStructure: z.record(z.unknown()),
  usdzStoragePath: z.string().max(500).optional(),
  previewStoragePath: z.string().max(500).optional(),
  units: z.string().default("meters"),
  confidence: z.string().max(40).optional(),
});

type JsonObject = Record<string, unknown>;
function headers() { return { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }; }
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: headers() }); }
function authToken(request: Request) { const value = request.headers.get("Authorization") ?? ""; return value.startsWith("Bearer ") ? value.slice(7) : ""; }
function asObjects(value: unknown): JsonObject[] { return Array.isArray(value) ? value.filter((item): item is JsonObject => Boolean(item && typeof item === "object")) : []; }
function numberAt(value: unknown, keys: string[]): number | null { if (!value || typeof value !== "object") return null; const object = value as JsonObject; for (const key of keys) { const number = Number(object[key]); if (Number.isFinite(number) && number > 0) return number; } return null; }
function dimensionsFromStructure(structure: JsonObject) {
  const direct = structure.dimensions && typeof structure.dimensions === "object" ? structure.dimensions as JsonObject : {};
  const rooms = asObjects(structure.rooms);
  const roomDimensions = rooms.map(room => room.dimensions && typeof room.dimensions === "object" ? room.dimensions as JsonObject : room);
  const candidates = [direct, structure, ...roomDimensions];
  const width = candidates.map(item => numberAt(item, ["width", "widthM", "width_m"])).find(Boolean) ?? null;
  const height = candidates.map(item => numberAt(item, ["height", "heightM", "height_m"])).find(Boolean) ?? null;
  const depth = candidates.map(item => numberAt(item, ["depth", "depthM", "depth_m", "length", "lengthM"])).find(Boolean) ?? null;
  return { width, height, depth };
}
function objectsFromStructure(structure: JsonObject) {
  const rooms = asObjects(structure.rooms);
  const result: Array<{ roomIndex: number; category: string; widthM: number | null; heightM: number | null; depthM: number | null; transform: unknown; confidence: string | null; metadata: JsonObject }> = [];
  const collections = ["objects", "walls", "doors", "windows", "openings", "floors"] as const;
  for (const [roomIndex, room] of rooms.entries()) for (const category of collections) for (const item of asObjects(room[category])) {
    const size = item.dimensions && typeof item.dimensions === "object" ? item.dimensions : item;
    result.push({ roomIndex, category: category === "objects" ? String(item.category ?? item.type ?? "object") : category, widthM: numberAt(size, ["width", "widthM", "width_m"]), heightM: numberAt(size, ["height", "heightM", "height_m"]), depthM: numberAt(size, ["depth", "depthM", "depth_m", "length", "lengthM"]), transform: item.transform ?? item.position ?? {}, confidence: typeof item.confidence === "string" ? item.confidence : null, metadata: item });
  }
  return result;
}
async function main(request: Request) {
  if (request.method === "OPTIONS") return new Response("ok", { headers: headers() });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const token = authToken(request); const supabaseUrl = Deno.env.get("SUPABASE_URL"); const anonKey = Deno.env.get("SUPABASE_ANON_KEY"); const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token || !supabaseUrl || !anonKey || !serviceKey) return json({ error: "server_configuration_incomplete" }, 500);
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_roomplan_payload", details: parsed.error.flatten() }, 400);
  const body = parsed.data; const structure = body.capturedStructure as JsonObject; const dimensions = dimensionsFromStructure(structure); const scanObjects = objectsFromStructure(structure);
  const { data: existing } = await admin.from("room_scans").select("id,project_id,status").eq("id", body.scanId).eq("user_id", userData.user.id).maybeSingle();
  const { data: scan, error: scanError } = await admin.from("room_scans").upsert({ id: body.scanId, user_id: userData.user.id, project_id: body.projectId ?? existing?.project_id ?? null, source: body.source, status: "processing", captured_structure: structure, usdz_storage_path: body.usdzStoragePath ?? null, preview_storage_path: body.previewStoragePath ?? null, units: body.units, confidence: body.confidence ?? null, updated_at: new Date().toISOString() }, { onConflict: "id" }).select("id,project_id,status").single();
  if (scanError || !scan) return json({ error: "room_scan_persistence_failed" }, 500);
  await admin.from("room_scan_objects").delete().eq("scan_id", body.scanId);
  if (scanObjects.length) { const { error } = await admin.from("room_scan_objects").insert(scanObjects.map(item => ({ scan_id: body.scanId, room_index: item.roomIndex, category: item.category, width_m: item.widthM, height_m: item.heightM, depth_m: item.depthM, transform: item.transform, confidence: item.confidence, metadata: item.metadata }))); if (error) return json({ error: "room_scan_objects_persistence_failed" }, 500); }
  let project = scan.project_id ? { id: scan.project_id } : null;
  if (!project && dimensions.width && dimensions.height && dimensions.depth) {
    const { data: created, error } = await admin.from("projects").insert({ user_id: userData.user.id, nome: body.projectName ?? "Projeto criado pelo RoomPlan", width: dimensions.width, height: dimensions.height, depth: dimensions.depth, modules: 1, drawers: 0, doors: 0, external_material: "" }).select("id,nome,width,height,depth").single();
    if (error || !created) { await admin.from("room_scans").update({ status: "failed", error_message: "project_creation_failed" }).eq("id", body.scanId); return json({ error: "project_creation_failed" }, 500); }
    project = created; await admin.from("room_scans").update({ project_id: created.id }).eq("id", body.scanId);
  }
  const status = project ? "completed" : "needs_review"; await admin.from("room_scans").update({ status, updated_at: new Date().toISOString() }).eq("id", body.scanId);
  return json({ ok: true, scanId: body.scanId, status, project, dimensions, objectCount: scanObjects.length, nextActions: project ? ["analisar_ambiente", "gerar_render", "gerar_orcamento", "gerar_plano_de_corte"] : ["confirmar_dimensoes"] });
}
serve(request => main(request).catch(error => { console.error("roomplan-ingest", error); return json({ error: "roomplan_ingest_failed" }, 500); }));
