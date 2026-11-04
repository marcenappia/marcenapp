import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const jsonHeaders = { "Content-Type": "application/json" };

type WhatsAppChange = {
  value?: {
    metadata?: { phone_number_id?: string; display_phone_number?: string };
    contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
    messages?: Array<{ id?: string; from?: string; timestamp?: string; type?: string; text?: { body?: string }; image?: { id?: string }; document?: { id?: string }; audio?: { id?: string }; video?: { id?: string } }>;
    statuses?: Array<{ id?: string; status?: string; timestamp?: string; errors?: Array<{ title?: string; message?: string }> }>;
  };
  field?: string;
};

type WhatsAppPayload = { object?: string; entry?: Array<{ id?: string; changes?: WhatsAppChange[] }> };

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function equalSecret(received: string, expected: string) {
  if (!received || !expected || received.length !== expected.length) return false;
  let diff = 0;
  for (let index = 0; index < expected.length; index += 1) diff |= received.charCodeAt(index) ^ expected.charCodeAt(index);
  return diff === 0;
}

function messageBody(message: NonNullable<NonNullable<WhatsAppChange["value"]>["messages"]>[number]) {
  if (message.type === "text") return message.text?.body?.trim() ?? null;
  if (message.type === "image") return "[Imagem recebida pelo WhatsApp]";
  if (message.type === "document") return "[Documento recebido pelo WhatsApp]";
  if (message.type === "audio") return "[Áudio recebido pelo WhatsApp]";
  if (message.type === "video") return "[Vídeo recebido pelo WhatsApp]";
  return `[Mensagem ${message.type ?? "não suportada"} recebida pelo WhatsApp]`;
}

function mediaId(message: NonNullable<NonNullable<WhatsAppChange["value"]>["messages"]>[number]) {
  return message.image?.id ?? message.document?.id ?? message.audio?.id ?? message.video?.id ?? null;
}

serve(async (request) => {
  const url = new URL(request.url);
  if (request.method === "GET") {
    const mode = url.searchParams.get("hub.mode") ?? "";
    const token = url.searchParams.get("hub.verify_token") ?? "";
    const challenge = url.searchParams.get("hub.challenge") ?? "";
    const expected = Deno.env.get("WHATSAPP_VERIFY_TOKEN")?.trim() ?? "";
    if (mode === "subscribe" && equalSecret(token, expected) && challenge) return new Response(challenge, { status: 200 });
    return response({ error: "Webhook verification failed" }, 403);
  }
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return response({ error: "Configuração do servidor incompleta" }, 500);
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    const payload = await request.json() as WhatsAppPayload;
    if (payload.object !== "whatsapp_business_account") return response({ received: true });

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;
        if (!phoneNumberId) continue;
        const { data: integration } = await admin.from("whatsapp_integrations").select("id,user_id").eq("phone_number_id", phoneNumberId).eq("status", "active").maybeSingle();
        if (!integration) {
          console.warn("WhatsApp webhook received for an unregistered phone_number_id", phoneNumberId);
          continue;
        }

        for (const status of value?.statuses ?? []) {
          if (!status.id || !status.status) continue;
          await admin.from("whatsapp_messages").update({ status: status.status, error_message: status.errors?.[0]?.message ?? null }).eq("external_message_id", status.id).eq("user_id", integration.user_id);
        }

        for (const message of value?.messages ?? []) {
          if (!message.id || !message.from) continue;
          const contact = value?.contacts?.find((item) => item.wa_id === message.from) ?? value?.contacts?.[0];
          const preview = messageBody(message);
          const { data: conversation, error: conversationError } = await admin.from("whatsapp_conversations").upsert({
            user_id: integration.user_id,
            integration_id: integration.id,
            wa_id: message.from,
            contact_name: contact?.profile?.name ?? null,
            last_message_at: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString(),
            last_message_preview: preview,
            updated_at: new Date().toISOString(),
          }, { onConflict: "integration_id,wa_id" }).select("id").single();
          if (conversationError || !conversation) throw conversationError ?? new Error("conversation_not_created");

          const { error: messageError } = await admin.from("whatsapp_messages").upsert({
            user_id: integration.user_id,
            conversation_id: conversation.id,
            external_message_id: message.id,
            direction: "inbound",
            message_type: message.type ?? "unknown",
            body: preview,
            media_id: mediaId(message),
            status: "received",
            raw_payload: message,
            occurred_at: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : null,
          }, { onConflict: "external_message_id", ignoreDuplicates: true });
          if (messageError) throw messageError;
        }
      }
    }
    return response({ received: true });
  } catch (error) {
    console.error("whatsapp-webhook error", error);
    return response({ error: "Não foi possível processar o webhook" }, 500);
  }
});
