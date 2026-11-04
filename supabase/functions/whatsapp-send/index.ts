import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
const GRAPH_VERSION = Deno.env.get("WHATSAPP_GRAPH_VERSION") ?? "v23.0";

type SendBody = { integrationId?: unknown; to?: unknown; body?: unknown };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  if (!supabaseUrl || !serviceRoleKey || !accessToken) return json({ error: "WhatsApp não configurado no servidor", code: "provider_not_configured" }, 500);

  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Não autenticado" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  try {
    const body = await request.json() as SendBody;
    const integrationId = typeof body.integrationId === "string" ? body.integrationId : "";
    const to = typeof body.to === "string" ? body.to.replace(/\D/g, "") : "";
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!integrationId || !/^\d{8,15}$/.test(to) || !text || text.length > 4096) return json({ error: "integrationId, telefone e mensagem são obrigatórios" }, 400);

    const { data: integration } = await admin.from("whatsapp_integrations").select("id,phone_number_id").eq("id", integrationId).eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (!integration) return json({ error: "Integração WhatsApp não encontrada" }, 404);

    const graphResponse = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${integration.phone_number_id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body: text } }),
    });
    const graphPayload = await graphResponse.json().catch(() => ({}));
    if (!graphResponse.ok) {
      console.error("WhatsApp Graph API send error", graphResponse.status, graphPayload);
      return json({ error: "WhatsApp recusou o envio", code: "provider_error" }, graphResponse.status >= 500 ? 502 : 400);
    }

    const messageId = graphPayload?.messages?.[0]?.id ?? null;
    const { data: conversation, error: conversationError } = await admin.from("whatsapp_conversations").upsert({ user_id: user.id, integration_id: integration.id, wa_id: to, last_message_at: new Date().toISOString(), last_message_preview: text, updated_at: new Date().toISOString() }, { onConflict: "integration_id,wa_id" }).select("id").single();
    if (conversationError || !conversation) throw conversationError ?? new Error("conversation_not_created");
    await admin.from("whatsapp_messages").insert({ user_id: user.id, conversation_id: conversation.id, external_message_id: messageId, direction: "outbound", message_type: "text", body: text, status: "sent", raw_payload: graphPayload, occurred_at: new Date().toISOString() });
    return json({ ok: true, messageId, conversationId: conversation.id });
  } catch (error) {
    console.error("whatsapp-send error", error);
    return json({ error: "Não foi possível enviar a mensagem" }, 500);
  }
});
