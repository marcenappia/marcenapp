import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@^2/cors";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MAX_BODY_BYTES = 512 * 1024;
const ASAAS_SANDBOX_URL = "https://api-sandbox.asaas.com/v3";
const ASAAS_PRODUCTION_URL = "https://api.asaas.com/v3";

const cors = (req: Request) => {
  const origin = req.headers.get("origin");
  let allowed = "null";
  try {
    if (origin) {
      const { hostname, protocol } = new URL(origin);
      const suffixes = [".lovable.app", ".lovableproject.com", ".lovable.dev"];
      const extra = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
      const official = [
        "https://www.marcenapp.com.br",
        "https://marcenapp.com.br",
        "https://marcenapp.vercel.app",
        "https://marcenapp-marcenapp.vercel.app",
        "https://marcenapp-git-main-marcenapp.vercel.app",
        "https://marcenapp.workers.dev",
      ];
      if (hostname === "localhost" || hostname === "127.0.0.1" || official.includes(origin) || extra.includes(origin) || (protocol === "https:" && suffixes.some((s) => hostname.endsWith(s)))) allowed = origin;
    }
  } catch { /* malformed origin */ }
  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
};

const json = (h: Record<string, string>, b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...h, "Content-Type": "application/json" } });
const readBody = async (req: Request) => { const n = Number(req.headers.get("content-length") ?? 0); if (n > MAX_BODY_BYTES) throw new Error("payload_too_large"); const t = await req.text(); if (t.length > MAX_BODY_BYTES) throw new Error("payload_too_large"); return t ? JSON.parse(t) : {}; };

async function requireUser(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token || !url || !key) return null;
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await admin.auth.getUser(token);
  return data?.user ?? null;
}
const admin = () => { const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if (!url || !key) throw Object.assign(new Error("server_config_incomplete"), { status: 500 }); return createClient(url, key); };
const base = () => ((Deno.env.get("ASAAS_ENVIRONMENT") ?? "sandbox").toLowerCase() === "production" ? ASAAS_PRODUCTION_URL : ASAAS_SANDBOX_URL);
const apiKey = () => Deno.env.get("ASAAS_API_KEY")?.trim() ?? "";

async function asaasJson(path: string, init: RequestInit = {}) {
  const key = apiKey();
  if (!key) throw Object.assign(new Error("asaas_not_configured"), { status: 503 });
  const headers = new Headers(init.headers); headers.set("Content-Type", "application/json"); headers.set("Accept", "application/json"); headers.set("User-Agent", "MARCENAPP/1.0 (billing)"); headers.set("access_token", key);
  const r = await fetch(`${base()}${path}`, { ...init, headers });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error("asaas_upstream_error"), { status: r.status, body: b });
  return b;
}
async function ownsCustomer(userId: string, customerId: string) {
  const { data, error } = await admin().from("billing_customers").select("asaas_customer_id").eq("user_id", userId).eq("asaas_customer_id", customerId).maybeSingle();
  if (error) throw Object.assign(new Error("billing_customer_lookup_failed"), { status: 500 });
  return Boolean(data);
}

const products = {
  render_unit: { name: "Crédito de Render", creditType: "image", credits: 1, amount: 50 },
  contract_unit: { name: "Crédito de Contrato", creditType: "contract", credits: 1, amount: 29.9 },
  cut_plan_unit: { name: "Crédito de Plano de Corte", creditType: "cut_plan", credits: 1, amount: 39.9 },
} as const;

const validPlans = ["essencial", "profissional", "empresa", "pro_factory"] as const;

serve(async (req) => {
  const h = cors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: h });
  try {
    const body = await readBody(req);
    const action = String(body.action ?? "");

    if (action === "webhook") {
      if (req.method !== "POST") return json(h, { error: "Method not allowed" }, 405);
      const expected = Deno.env.get("ASAAS_WEBHOOK_TOKEN")?.trim(), received = req.headers.get("asaas-access-token")?.trim();
      if (!expected || !received || expected !== received) return json(h, { error: "Webhook não autorizado." }, 401);
      const event = body.event;
      if (!event?.id || !event?.event) return json(h, { error: "Evento Asaas inválido." }, 400);
      const a = admin(), payment = event.payment ?? {}, subscriptionId = payment.subscription ?? event.subscription?.id ?? null;
      const { error } = await a.from("asaas_webhook_events").insert({ event_id: event.id, event_type: event.event, payment_id: payment.id ?? null, customer_id: payment.customer ?? event.customer?.id ?? null, subscription_id: subscriptionId, payload: event });
      const duplicate = Boolean(error && (String(error.code ?? "") === "23505" || String(error.message).toLowerCase().includes("duplicate")));
      if (error && !duplicate) return json(h, { error: "Não foi possível registrar o webhook." }, 500);
      if (event.subscription?.id && event.subscription?.status) await a.from("billing_subscriptions").update({ status: String(event.subscription.status), updated_at: new Date().toISOString() }).eq("asaas_subscription_id", String(event.subscription.id));
      if (payment.id) {
        const status = String(payment.status ?? event.event ?? "PENDING");
        const receivedStatus = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(status) || event.event === "PAYMENT_RECEIVED";
        const { data: processed, error: processError } = await a.rpc("process_billing_payment", { p_payment_id: String(payment.id), p_status: status, p_received: receivedStatus });
        if (processError) return json(h, { error: "Não foi possível processar a compra." }, 500);
        return json(h, { received: true, duplicate, processed: Boolean(processed) });
      }
      return json(h, { received: true, duplicate, processed: false });
    }

    const user = await requireUser(req);
    if (!user) return json(h, { error: "Autenticação necessária." }, 401);

    if (action === "connection_status") {
      if (!apiKey()) return json(h, { connected: false, configured: false, environment: Deno.env.get("ASAAS_ENVIRONMENT") ?? "sandbox" });
      await asaasJson("/customers?limit=1");
      return json(h, { connected: true, configured: true, environment: Deno.env.get("ASAAS_ENVIRONMENT") ?? "sandbox" });
    }

    if (action === "create_customer") {
      const customer = { name: String(body.name ?? "").trim(), cpfCnpj: body.cpfCnpj ? String(body.cpfCnpj).replace(/\D/g, "") : undefined, email: body.email ? String(body.email).trim() : undefined, mobilePhone: body.mobilePhone ? String(body.mobilePhone).replace(/\D/g, "") : undefined };
      if (!customer.name) return json(h, { error: "Nome do cliente é obrigatório." }, 400);
      const reference = `marcenapp:${user.id}:${crypto.randomUUID()}`;
      const created = await asaasJson("/customers", { method: "POST", body: JSON.stringify({ ...customer, externalReference: reference }) });
      if (!created?.id) return json(h, { error: "Asaas não retornou o ID do cliente." }, 502);
      const { error } = await admin().from("billing_customers").insert({ user_id: user.id, asaas_customer_id: String(created.id), external_reference: reference });
      if (error) return json(h, { error: "Cliente criado no Asaas, mas não foi possível vincular ao MARCENAPP." }, 502);
      return json(h, { customer: created, reused: false });
    }

    if (action === "create_product_payment") {
      const key = String(body.productKey ?? "") as keyof typeof products, product = products[key];
      if (!product) return json(h, { error: "Produto avulso inválido." }, 400);
      const customer = String(body.customerId ?? "").trim();
      if (!customer || !await ownsCustomer(user.id, customer)) return json(h, { error: "Cliente de cobrança inválido." }, 403);
      const billingType = String(body.billingType ?? "UNDEFINED");
      if (!["UNDEFINED", "BOLETO", "CREDIT_CARD", "PIX"].includes(billingType)) return json(h, { error: "Forma de pagamento inválida." }, 400);
      const externalReference = `marcenapp:product:${key}:${user.id}:${crypto.randomUUID()}`;
      const payment = await asaasJson("/payments", { method: "POST", body: JSON.stringify({ customer, billingType, value: product.amount, dueDate: body.dueDate ?? new Date().toISOString().slice(0, 10), description: product.name, externalReference, callback: { successUrl: "https://www.marcenapp.com.br/?module=billing&payment=success", autoRedirect: true } }) });
      const { error } = await admin().from("billing_purchases").insert({ user_id: user.id, product_key: key, product_name: product.name, credit_type: product.creditType, credits: product.credits, amount: product.amount, asaas_customer_id: customer, asaas_payment_id: String(payment.id), status: String(payment.status ?? "PENDING") });
      if (error) return json(h, { error: "Cobrança criada, mas não foi possível registrar a compra no MARCENAPP." }, 502);
      const checkoutUrl = payment?.invoiceUrl ?? payment?.bankSlipUrl ?? payment?.transactionReceiptUrl ?? null;
      return json(h, { payment, product, checkoutUrl });
    }

    if (action === "get_wallet") {
      const { data, error } = await admin().from("billing_wallets").select("image_credits,contract_credits,cut_plan_credits,marcena_credits,updated_at").eq("user_id", user.id).maybeSingle();
      if (error) return json(h, { error: "Não foi possível carregar seus créditos." }, 500);
      return json(h, { wallet: data ?? { image_credits: 0, contract_credits: 0, cut_plan_credits: 0, marcena_credits: 0 } });
    }

    if (action === "create_subscription") {
      const customer = String(body.customerId ?? "").trim(), plan = String(body.plan ?? "").toLowerCase();
      if (!customer || !validPlans.includes(plan as typeof validPlans[number])) return json(h, { error: "Cliente e plano válidos são obrigatórios." }, 400);
      if (!await ownsCustomer(user.id, customer)) return json(h, { error: "Cliente de cobrança não pertence à sua conta." }, 403);
      const billingType = String(body.billingType ?? "UNDEFINED");
      if (!["UNDEFINED", "BOLETO", "CREDIT_CARD", "PIX"].includes(billingType)) return json(h, { error: "Forma de pagamento inválida." }, 400);
      const { data: planRow, error: planError } = await admin().from("billing_plans").select("code,name,monthly_price_cents,status,features").eq("code", plan).eq("status", "active").maybeSingle();
      if (planError || !planRow?.monthly_price_cents) return json(h, { error: "Plano não está disponível para compra." }, 409);
      const value = Number(planRow.monthly_price_cents) / 100;
      const nextDueDate = String(body.nextDueDate ?? new Date().toISOString().slice(0, 10));
      const externalReference = `marcenapp:subscription:${user.id}:${plan}:${crypto.randomUUID()}`;
      const subscription = await asaasJson("/subscriptions", { method: "POST", body: JSON.stringify({ customer, billingType, value, cycle: "MONTHLY", nextDueDate, description: String(planRow.name).slice(0, 500), externalReference, callback: { successUrl: "https://www.marcenapp.com.br/?module=billing&payment=success", autoRedirect: true } }) });
      const { error } = await admin().from("billing_subscriptions").insert({ user_id: user.id, plan, asaas_customer_id: customer, asaas_subscription_id: String(subscription.id), status: String(subscription.status ?? "ACTIVE"), trial_ends_at: nextDueDate });
      if (error) return json(h, { error: "Assinatura criada no Asaas, mas não foi possível registrar no MARCENAPP." }, 502);
      const checkoutUrl = subscription?.invoiceUrl ?? subscription?.bankSlipUrl ?? subscription?.transactionReceiptUrl ?? null;
      return json(h, { subscription, plan: planRow, checkoutUrl });
    }

    if (action === "get_payment" || action === "get_pix_qr") {
      const paymentId = String(body.paymentId ?? "").trim();
      if (!paymentId) return json(h, { error: "paymentId é obrigatório." }, 400);
      const payment = await asaasJson(`/payments/${encodeURIComponent(paymentId)}`), customerId = String(payment?.customer ?? "");
      if (!customerId || !await ownsCustomer(user.id, customerId)) return json(h, { error: "Cobrança não pertence à sua conta." }, 403);
      if (action === "get_payment") return json(h, { payment });
      return json(h, { pix: await asaasJson(`/payments/${encodeURIComponent(paymentId)}/pixQrCode`) });
    }

    return json(h, { error: "Ação Asaas desconhecida." }, 400);
  } catch (error) {
    console.error("asaas error", error);
    const status = Number((error as Error & { status?: number }).status ?? 500);
    if ((error as Error).message === "asaas_not_configured") return json(h, { error: "Asaas não está configurado no servidor." }, 503);
    if ((error as Error).message === "payload_too_large") return json(h, { error: "Corpo da requisição muito grande." }, 413);
    if (status === 401 || status === 403) return json(h, { error: "Asaas recusou a credencial ou a operação." }, 502);
    return json(h, { error: "Falha ao processar integração Asaas." }, status >= 400 && status < 600 ? status : 500);
  }
});
