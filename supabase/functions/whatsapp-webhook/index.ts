import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const jsonHeaders = { "Content-Type": "application/json" };
const GRAPH_VERSION = Deno.env.get("WHATSAPP_GRAPH_VERSION") ?? "v23.0";

type WhatsAppMessage = { id?: string; from?: string; timestamp?: string; type?: string; text?: { body?: string }; image?: { id?: string }; document?: { id?: string }; audio?: { id?: string }; video?: { id?: string } };
type WhatsAppChange = { value?: { metadata?: { phone_number_id?: string; display_phone_number?: string }; contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>; messages?: WhatsAppMessage[]; statuses?: Array<{ id?: string; status?: string; timestamp?: string; errors?: Array<{ title?: string; message?: string }> }> }; field?: string };
type WhatsAppPayload = { object?: string; entry?: Array<{ id?: string; changes?: WhatsAppChange[] }> };
type Integration = { id: string; user_id: string; phone_number_id: string };

type AdminClient = ReturnType<typeof createClient>;
function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: jsonHeaders }); }
function equalSecret(received: string, expected: string) { if (!received || !expected || received.length !== expected.length) return false; let diff = 0; for (let index = 0; index < expected.length; index += 1) diff |= received.charCodeAt(index) ^ expected.charCodeAt(index); return diff === 0; }
function messageBody(message: WhatsAppMessage) { if (message.type === "text") return message.text?.body?.trim() ?? null; if (message.type === "image") return "[Imagem recebida pelo WhatsApp]"; if (message.type === "document") return "[Documento recebido pelo WhatsApp]"; if (message.type === "audio") return "[Áudio recebido pelo WhatsApp]"; if (message.type === "video") return "[Vídeo recebido pelo WhatsApp]"; return `[Mensagem ${message.type ?? "não suportada"} recebida pelo WhatsApp]`; }
function mediaId(message: WhatsAppMessage) { return message.image?.id ?? message.document?.id ?? message.audio?.id ?? message.video?.id ?? null; }
function numberValue(raw: string): number | undefined {
  const value = raw.toLocaleLowerCase("pt-BR").replace(",", ".").trim();
  const compound = value.match(/^(\d+(?:\.\d+)?)\s*(?:m|metros?)\s+e\s+(vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa)$/i);
  if (compound) { const fraction: Record<string, number> = { vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90 }; return (Number(compound[1]) + (fraction[compound[2]] ?? 0) / 100) * 1000; }
  const match = value.match(/^(\d+(?:\.\d+)?)\s*(mm|milímetros?|cm|centímetros?|m|metros?)?$/i); if (!match) return undefined;
  const number = Number(match[1]); const unit = match[2] ?? "";
  if (/^(m|metros?)$/i.test(unit)) return number * 1000; if (/^(cm|centímetros?)$/i.test(unit)) return number * 10; if (/^(mm|milímetros?)$/i.test(unit)) return number; return number < 10 ? number * 1000 : number;
}
function extractDimension(text: string, labels: string): number | undefined {
  const measure = "(\\d+(?:[.,]\\d+)?\\s*(?:mm|milímetros?|cm|centímetros?|m|metros?)(?:\\s+e\\s+(?:vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa))?)";
  const pattern = new RegExp(`${measure}\\s+(?:de\\s+)?(?:${labels})\\b|(?:${labels})\\s*(?:é|e|de|:|=)?\\s*${measure}`, "i");
  const match = text.match(pattern); const raw = match?.[1] ?? match?.[2]; return raw ? numberValue(raw) : undefined;
}
function parseCreate(text: string) {
  const normalized = text.toLocaleLowerCase("pt-BR");
  if (!/\b(crie|criar|cria|quero|preciso|novo projeto|monte|faça|faca)\b/.test(normalized) || !/\b(projeto|móvel|movel|armário|armario|cozinha|bancada)\b/.test(normalized)) return null;
  const triple = normalized.match(/(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?/i);
  const unit = (raw: string, suffix?: string) => numberValue(`${raw}${suffix ?? ""}`);
  const dimensions = triple ? { width: unit(triple[1], triple[2]), height: unit(triple[3], triple[4]), depth: unit(triple[5], triple[6]) } : { width: extractDimension(normalized, "largura|largo|comprimento"), height: extractDimension(normalized, "altura|alto"), depth: extractDimension(normalized, "profundidade|profundo") };
  const missing = Object.entries(dimensions).filter(([, value]) => !value).map(([axis]) => axis === "width" ? "largura" : axis === "height" ? "altura" : "profundidade");
  const type = normalized.match(/(?:crie|criar|cria|novo|monte|faça|faca)\s+(?:um|uma)?\s*([a-záàâãéêíóôõúç\s-]+?)(?=\s+(?:com|de|medindo|\d)|$)/i)?.[1]?.trim() || "Novo projeto";
  if (missing.length) return { missing, type };
  const doors = normalized.match(/(\d+)\s+portas?\b/i)?.[1]; const drawers = normalized.match(/(\d+)\s+gavetas?\b/i)?.[1];
  return { type, width: dimensions.width!, height: dimensions.height!, depth: dimensions.depth!, ...(doors ? { doors: Number(doors) } : {}), ...(drawers ? { drawers: Number(drawers) } : {}) };
}
async function sendText(admin: AdminClient, integration: Integration, to: string, text: string, userId: string, conversationId: string) {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN"); if (!accessToken) throw new Error("whatsapp_access_token_missing");
  const graphResponse = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${integration.phone_number_id}/messages`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body: text.slice(0, 4096) } }) });
  const payload = await graphResponse.json().catch(() => ({})) as { messages?: Array<{ id?: string }>; error?: { message?: string } };
  if (!graphResponse.ok) throw new Error(`whatsapp_send_${graphResponse.status}:${payload.error?.message ?? "provider_error"}`);
  const externalId = payload.messages?.[0]?.id ?? null;
  await admin.from("whatsapp_messages").insert({ user_id: userId, conversation_id: conversationId, external_message_id: externalId, direction: "outbound", message_type: "text", body: text, status: "sent", raw_payload: payload, occurred_at: new Date().toISOString() });
  return externalId;
}
async function processMessage(admin: AdminClient, integration: Integration, conversationId: string, messageRowId: string, from: string, body: string) {
  const parsed = parseCreate(body);
  let reply: string;
  if (parsed?.missing?.length) {
    reply = `Entendi que você quer criar um projeto${parsed.type !== "Novo projeto" ? ` de ${parsed.type}` : ""}. Para continuar, informe: ${parsed.missing.join(", ")}. Exemplo: 2,50 m de largura, 2,00 m de altura e 0,60 m de profundidade.`;
  } else if (parsed) {
    const { data: project, error } = await admin.from("projects").insert({ user_id: integration.user_id, nome: parsed.type, width: parsed.width / 1000, height: parsed.height / 1000, depth: parsed.depth / 1000, modules: 1, drawers: parsed.drawers ?? 0, doors: parsed.doors ?? 0, external_material: "" }).select("id,nome,width,height,depth").single();
    if (error || !project) throw error ?? new Error("project_not_created");
    reply = `Projeto *${project.nome}* criado com sucesso. Medidas: ${parsed.width} × ${parsed.height} × ${parsed.depth} mm. Código: ${project.id.slice(0, 8)}. Você pode pedir o render ou o orçamento deste projeto.`;
  } else if (/\b(render|renderizar|imagem|analise|analise|ambiente|foto)\b/i.test(body)) {
    reply = "Recebi o pedido visual. Para renderizar ou analisar o ambiente, envie a foto pelo WhatsApp e mantenha o projeto selecionado no Marcenapp; vou colocar esse processamento na fila visual em seguida.";
  } else {
    reply = "Recebi sua mensagem. Posso criar projetos com medidas, renderizar um projeto com foto, analisar um ambiente e preparar um orçamento. Para começar, diga por exemplo: Crie um armário de 2,50 m de largura, 2 m de altura e 0,60 m de profundidade.";
  }
  const externalReplyId = await sendText(admin, integration, from, reply, integration.user_id, conversationId);
  await admin.from("whatsapp_messages").update({ agent_status: "completed", agent_processed_at: new Date().toISOString(), agent_reply_message_id: externalReplyId }).eq("id", messageRowId);
}
async function processInbound(admin: AdminClient, integration: Integration, conversationId: string, messageRowId: string, from: string, body: string) {
  const { data: claimed } = await admin.from("whatsapp_messages").update({ agent_status: "processing" }).eq("id", messageRowId).eq("agent_status", "pending").select("id").maybeSingle();
  if (!claimed) return;
  try { await processMessage(admin, integration, conversationId, messageRowId, from, body); } catch (error) { console.error("whatsapp-yara error", error); await admin.from("whatsapp_messages").update({ agent_status: "failed", agent_processed_at: new Date().toISOString(), agent_error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500) }).eq("id", messageRowId); }
}
serve(async (request) => {
  const url = new URL(request.url);
  if (request.method === "GET") { const mode = url.searchParams.get("hub.mode") ?? ""; const token = url.searchParams.get("hub.verify_token") ?? ""; const challenge = url.searchParams.get("hub.challenge") ?? ""; const expected = Deno.env.get("WHATSAPP_VERIFY_TOKEN")?.trim() ?? ""; if (mode === "subscribe" && equalSecret(token, expected) && challenge) return new Response(challenge, { status: 200 }); return response({ error: "Webhook verification failed" }, 403); }
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL"); const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if (!supabaseUrl || !serviceRoleKey) return response({ error: "Configuração do servidor incompleta" }, 500);
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  try {
    const payload = await request.json() as WhatsAppPayload; if (payload.object !== "whatsapp_business_account") return response({ received: true });
    const pending: Array<Promise<void>> = [];
    for (const entry of payload.entry ?? []) for (const change of entry.changes ?? []) {
      const value = change.value; const phoneNumberId = value?.metadata?.phone_number_id; if (!phoneNumberId) continue;
      const { data: integration } = await admin.from("whatsapp_integrations").select("id,user_id,phone_number_id").eq("phone_number_id", phoneNumberId).eq("status", "active").maybeSingle() as { data: Integration | null };
      if (!integration) continue;
      for (const status of value?.statuses ?? []) if (status.id && status.status) await admin.from("whatsapp_messages").update({ status: status.status, error_message: status.errors?.[0]?.message ?? null }).eq("external_message_id", status.id).eq("user_id", integration.user_id);
      for (const message of value?.messages ?? []) {
        if (!message.id || !message.from) continue;
        const contact = value?.contacts?.find(item => item.wa_id === message.from) ?? value?.contacts?.[0]; const preview = messageBody(message); if (!preview) continue;
        const { data: conversation, error: conversationError } = await admin.from("whatsapp_conversations").upsert({ user_id: integration.user_id, integration_id: integration.id, wa_id: message.from, contact_name: contact?.profile?.name ?? null, last_message_at: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString(), last_message_preview: preview, updated_at: new Date().toISOString() }, { onConflict: "integration_id,wa_id" }).select("id").single(); if (conversationError || !conversation) throw conversationError ?? new Error("conversation_not_created");
        const { data: stored, error: messageError } = await admin.from("whatsapp_messages").upsert({ user_id: integration.user_id, conversation_id: conversation.id, external_message_id: message.id, direction: "inbound", message_type: message.type ?? "unknown", body: preview, media_id: mediaId(message), status: "received", agent_status: "pending", raw_payload: message, occurred_at: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : null }, { onConflict: "external_message_id", ignoreDuplicates: true }).select("id,agent_status").maybeSingle(); if (messageError) throw messageError;
        if (stored?.id) pending.push(processInbound(admin, integration, conversation.id, stored.id, message.from, preview));
      }
    }
    const runtime = globalThis as typeof globalThis & { EdgeRuntime?: { waitUntil: (promise: Promise<unknown>) => void } }; if (pending.length) runtime.EdgeRuntime?.waitUntil(Promise.all(pending));
    return response({ received: true, queued: pending.length });
  } catch (error) { console.error("whatsapp-webhook error", error); return response({ error: "Não foi possível processar o webhook" }, 500); }
});
