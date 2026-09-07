import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MAX_BODY_BYTES = 512 * 1024;
const ASAAS_SANDBOX_URL = "https://api-sandbox.asaas.com/v3";
const ASAAS_PRODUCTION_URL = "https://api.asaas.com/v3";

const cors = (req: Request): Record<string, string> => {
  const origin = req.headers.get("origin");
  let allowed = "null";
  try {
    if (origin) {
      const { hostname, protocol } = new URL(origin);
      const suffixes = [".lovable.app", ".lovableproject.com", ".lovable.dev"];
      const extra = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      if (hostname === "localhost" || hostname === "127.0.0.1" || extra.includes(origin) || (protocol === "https:" && suffixes.some((s) => hostname.endsWith(s)))) {
        allowed = origin;
      }
    }
  } catch {
    allowed = "null";
  }
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
};

const json = (headers: Record<string, string>, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

const readBody = async (req: Request) => {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) throw new Error("payload_too_large");
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new Error("payload_too_large");
  return text ? JSON.parse(text) : {};
};

async function requireUser(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token || !url || !serviceKey) return null;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data } = await admin.auth.getUser(token);
  return data?.user ?? null;
}

function asaasBaseUrl() {
  return (Deno.env.get("ASAAS_ENVIRONMENT") ?? "sandbox").toLowerCase() === "production"
    ? ASAAS_PRODUCTION_URL
    : ASAAS_SANDBOX_URL;
}

function asaasKey() {
  return Deno.env.get("ASAAS_API_KEY")?.trim() ?? "";
}

async function asaasRequest(path: string, init: RequestInit = {}) {
  const key = asaasKey();
  if (!key) throw new Error("asaas_not_configured");
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  headers.set("User-Agent", "MARCENAPP/1.0 (billing)");
  headers.set("access_token", key);
  return fetch(`${asaasBaseUrl()}${path}`, { ...init, headers });
}

async function asaasJson(path: string, init: RequestInit = {}) {
  const response = await asaasRequest(path, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error("asaas_upstream_error");
    (error as Error & { status?: number; body?: unknown }).status = response.status;
    (error as Error & { status?: number; body?: unknown }).body = body;
    throw error;
  }
  return body;
}

serve(async (req) => {
  const headers = cors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers });

  try {
    const body = await readBody(req);
    const action = String(body.action ?? "");

    // Webhook: no user JWT. Authenticate with the dedicated Asaas webhook token.
    if (action === "webhook") {
      if (req.method !== "POST") return json(headers, { error: "Method not allowed" }, 405);
      const expected = Deno.env.get("ASAAS_WEBHOOK_TOKEN")?.trim();
      const received = req.headers.get("asaas-access-token")?.trim();
      if (!expected || !received || expected !== received) {
        return json(headers, { error: "Webhook não autorizado." }, 401);
      }

      const event = body.event;
      if (!event?.id || !event?.event) return json(headers, { error: "Evento Asaas inválido." }, 400);

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseUrl || !serviceKey) return json(headers, { error: "Configuração do servidor incompleta." }, 500);

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

      // Duplicate delivery is expected: event_id is unique. A duplicate is still acknowledged.
      if (error && !String(error.message).toLowerCase().includes("duplicate")) {
        console.error("Asaas webhook persistence error", error);
        return json(headers, { error: "Não foi possível registrar o webhook." }, 500);
      }

      return json(headers, { received: true, duplicate: Boolean(error) });
    }

    const user = await requireUser(req);
    if (!user) return json(headers, { error: "Autenticação necessária." }, 401);

    if (action === "connection_status") {
      const key = asaasKey();
      if (!key) return json(headers, { connected: false, configured: false, environment: Deno.env.get("ASAAS_ENVIRONMENT") ?? "sandbox" });
      const result = await asaasJson("/customers?limit=1");
      return json(headers, {
        connected: true,
        configured: true,
        environment: Deno.env.get("ASAAS_ENVIRONMENT") ?? "sandbox",
        customerCount: Number(result.totalCount ?? 0),
      });
    }

    if (action === "list_customers") {
      const params = new URLSearchParams();
      params.set("limit", String(Math.min(Number(body.limit ?? 20), 100)));
      params.set("offset", String(Math.max(Number(body.offset ?? 0), 0)));
      if (body.externalReference) params.set("externalReference", String(body.externalReference));
      if (body.cpfCnpj) params.set("cpfCnpj", String(body.cpfCnpj));
      if (body.email) params.set("email", String(body.email));
      return json(headers, await asaasJson(`/customers?${params.toString()}`));
    }

    if (action === "create_customer") {
      const customer = {
        name: String(body.name ?? "").trim(),
        cpfCnpj: body.cpfCnpj ? String(body.cpfCnpj).replace(/\D/g, "") : undefined,
        email: body.email ? String(body.email).trim() : undefined,
        mobilePhone: body.mobilePhone ? String(body.mobilePhone).replace(/\D/g, "") : undefined,
        externalReference: body.externalReference ? String(body.externalReference) : undefined,
      };
      if (!customer.name) return json(headers, { error: "Nome do cliente é obrigatório." }, 400);
      const existing = customer.externalReference
        ? await asaasJson(`/customers?externalReference=${encodeURIComponent(customer.externalReference)}&limit=1`)
        : null;
      if (existing?.data?.[0]) return json(headers, { customer: existing.data[0], reused: true });
      return json(headers, { customer: await asaasJson("/customers", { method: "POST", body: JSON.stringify(customer) }), reused: false });
    }

    if (action === "create_payment") {
      const customer = String(body.customerId ?? "").trim();
      const value = Number(body.value);
      const billingType = String(body.billingType ?? "UNDEFINED");
      if (!customer || !Number.isFinite(value) || value <= 0) return json(headers, { error: "Cliente e valor válido são obrigatórios." }, 400);
      if (!["UNDEFINED", "BOLETO", "PIX", "CREDIT_CARD"].includes(billingType)) return json(headers, { error: "Forma de pagamento inválida." }, 400);
      const payment = await asaasJson("/payments", {
        method: "POST",
        body: JSON.stringify({
          customer,
          billingType,
          value,
          dueDate: body.dueDate ?? new Date().toISOString().slice(0, 10),
          description: body.description ? String(body.description).slice(0, 500) : undefined,
          externalReference: body.externalReference ? String(body.externalReference) : undefined,
          installmentCount: body.installmentCount ? Number(body.installmentCount) : undefined,
          totalValue: body.totalValue ? Number(body.totalValue) : undefined,
        }),
      });
      return json(headers, { payment });
    }

    if (action === "get_pix_qr") {
      const paymentId = String(body.paymentId ?? "").trim();
      if (!paymentId) return json(headers, { error: "paymentId é obrigatório." }, 400);
      return json(headers, { pix: await asaasJson(`/payments/${encodeURIComponent(paymentId)}/pixQrCode`) });
    }

    if (action === "create_subscription") {
      const customer = String(body.customerId ?? "").trim();
      const value = Number(body.value);
      const billingType = String(body.billingType ?? "UNDEFINED");
      const cycle = String(body.cycle ?? "MONTHLY");
      if (!customer || !Number.isFinite(value) || value <= 0) return json(headers, { error: "Cliente e valor válido são obrigatórios." }, 400);
      if (!["UNDEFINED", "BOLETO", "CREDIT_CARD", "PIX"].includes(billingType)) return json(headers, { error: "Forma de pagamento inválida." }, 400);
      return json(headers, { subscription: await asaasJson("/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          customer,
          billingType,
          value,
          cycle,
          nextDueDate: body.nextDueDate ?? new Date().toISOString().slice(0, 10),
          description: body.description ? String(body.description).slice(0, 500) : undefined,
          externalReference: body.externalReference ? String(body.externalReference) : undefined,
        }),
      }) });
    }

    if (action === "get_payment") {
      const paymentId = String(body.paymentId ?? "").trim();
      if (!paymentId) return json(headers, { error: "paymentId é obrigatório." }, 400);
      return json(headers, { payment: await asaasJson(`/payments/${encodeURIComponent(paymentId)}`) });
    }

    return json(headers, { error: "Ação Asaas não suportada." }, 400);
  } catch (error) {
    const err = error as Error & { status?: number; body?: unknown };
    if (err.message === "payload_too_large") return json(headers, { error: "Payload muito grande." }, 413);
    if (err.message === "asaas_not_configured") return json(headers, { error: "Asaas ainda não configurado. Cadastre ASAAS_API_KEY no ambiente seguro da Edge Function.", code: "not_configured" }, 503);
    console.error("Asaas integration error", err);
    return json(headers, { error: "Falha na integração Asaas.", code: "upstream_error", details: err.body ?? null }, Number(err.status ?? 502));
  }
});
