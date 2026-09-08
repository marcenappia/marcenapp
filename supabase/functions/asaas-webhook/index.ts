import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });

  try {
    const expected = Deno.env.get("ASAAS_WEBHOOK_TOKEN")?.trim();
    const received = req.headers.get("asaas-access-token")?.trim();
    if (!expected || !received || expected !== received) {
      return new Response(JSON.stringify({ error: "Webhook não autorizado." }), { status: 401, headers: cors });
    }

    const event = await req.json();
    if (!event?.id || !event?.event) {
      return new Response(JSON.stringify({ error: "Evento Asaas inválido." }), { status: 400, headers: cors });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Configuração do servidor incompleta." }), { status: 500, headers: cors });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const payment = event.payment ?? {};
    const subscriptionId = payment.subscription ?? event.subscription?.id ?? null;

    const { error } = await admin.from("asaas_webhook_events").insert({
      event_id: event.id,
      event_type: event.event,
      payment_id: payment.id ?? null,
      customer_id: payment.customer ?? event.customer?.id ?? null,
      subscription_id: subscriptionId,
      payload: event,
    });

    if (error && !String(error.message).toLowerCase().includes("duplicate")) {
      console.error("Asaas webhook persistence error", error);
      return new Response(JSON.stringify({ error: "Não foi possível registrar o webhook." }), { status: 500, headers: cors });
    }

    // Always acknowledge duplicate deliveries: Asaas may retry deliveries that were not acknowledged.
    return new Response(JSON.stringify({ received: true, duplicate: Boolean(error) }), { status: 200, headers: cors });
  } catch (error) {
    console.error("Asaas webhook error", error);
    return new Response(JSON.stringify({ error: "Falha ao processar webhook." }), { status: 500, headers: cors });
  }
});
