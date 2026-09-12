import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MAX_BODY_BYTES = 512 * 1024;
const ASAAS_SANDBOX_URL = "https://api-sandbox.asaas.com/v3";
const ASAAS_PRODUCTION_URL = "https://api.asaas.com/v3";
const BILLING_TYPES = ["UNDEFINED", "BOLETO", "CREDIT_CARD", "PIX"] as const;

type AsaasPayment = Record<string, unknown> & { id?: string; customer?: string; status?: string; subscription?: string; externalReference?: string };
type AsaasSubscription = Record<string, unknown> & { id?: string; customer?: string; status?: string; externalReference?: string; nextDueDate?: string };

const cors = (req: Request) => {
  const origin = req.headers.get("origin");
  let allowed = "null";
  try {
    if (origin) {
      const { hostname, protocol } = new URL(origin);
      const suffixes = [".lovable.app", ".lovableproject.com", ".lovable.dev"];
      const extra = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
      const official = ["https://www.marcenapp.com.br", "https://marcenapp.com.br"];
      if (hostname === "localhost" || hostname === "127.0.0.1" || official.includes(origin) || extra.includes(origin) || (protocol === "https:" && suffixes.some((s) => hostname.endsWith(s)))) allowed = origin;
    }
  } catch { /* malformed origin */ }
  return { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", Vary: "Origin" };
};

const json = (h: Record<string, string>, b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...h, "Content-Type": "application/json" } });
const readBody = async (req: Request) => { const n = Number(req.headers.get("content-length") ?? 0); if (n > MAX_BODY_BYTES) throw new Error("payload_too_large"); const t = await req.text(); if (t.length > MAX_BODY_BYTES) throw new Error("payload_too_large"); return t ? JSON.parse(t) : {}; };

async function requireUser(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token || !url || !key) return null;
  const a = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await a.auth.getUser(token);
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

async function findAsaasCustomerByReference(reference: string) {
  const result = await asaasJson(`/customers?externalReference=${encodeURIComponent(reference)}&limit=10`);
  return (result?.data?.[0] ?? null) as Record<string, unknown> | null;
}

async function ensureCustomer(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }) {
  const a = admin();
  const { data: owned, error: lookupError } = await a.from("billing_customers").select("asaas_customer_id,external_reference").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (lookupError) throw Object.assign(new Error("billing_customer_lookup_failed"), { status: 500 });
  if (owned?.asaas_customer_id) return { id: String(owned.asaas_customer_id), reused: true };

  const reference = `marcenapp:customer:${user.id}`;
  const existing = await findAsaasCustomerByReference(reference);
  if (existing?.id) {
    const { error } = await a.from("billing_customers").insert({ user_id: user.id, asaas_customer_id: String(existing.id), external_reference: reference });
    if (!error || String(error.code ?? "") === "23505") return { id: String(existing.id), reused: true };
    throw Object.assign(new Error("billing_customer_link_failed"), { status: 502 });
  }

  const m = user.user_metadata ?? {};
  const name = String(m.name ?? m.full_name ?? user.email?.split("@")[0] ?? "Cliente Marcenapp").trim();
  if (!name) throw Object.assign(new Error("customer_name_required"), { status: 400 });
  const created = await asaasJson("/customers", { method: "POST", body: JSON.stringify({ name, email: user.email ?? undefined, externalReference: reference }) });
  if (!created?.id) throw Object.assign(new Error("asaas_customer_missing_id"), { status: 502 });
  const { error } = await a.from("billing_customers").insert({ user_id: user.id, asaas_customer_id: String(created.id), external_reference: reference });
  if (!error) return { id: String(created.id), reused: false };

  const recovered = await findAsaasCustomerByReference(reference);
  if (recovered?.id) {
    const { error: recoveryError } = await a.from("billing_customers").insert({ user_id: user.id, asaas_customer_id: String(recovered.id), external_reference: reference });
    if (!recoveryError || String(recoveryError.code ?? "") === "23505") return { id: String(recovered.id), reused: true };
  }
  throw Object.assign(new Error("billing_customer_link_failed"), { status: 502 });
}

async function getActiveProduct(productKey: string) {
  const { data, error } = await admin().from("billing_credit_products").select("code,name,description,operation_type,credit_type,credits,price_cents,status").eq("code", productKey).eq("status", "active").maybeSingle();
  if (error) throw Object.assign(new Error("billing_product_lookup_failed"), { status: 500 });
  if (!data || !data.price_cents || data.price_cents <= 0 || data.credits <= 0) throw Object.assign(new Error("product_not_available"), { status: 409 });
  return data;
}

async function reconcilePayment(externalReference: string, purchaseId: string, customerId: string) {
  const result = await asaasJson(`/payments?externalReference=${encodeURIComponent(externalReference)}&limit=10`);
  const payment = (result?.data?.[0] ?? null) as AsaasPayment | null;
  if (!payment?.id) return null;
  const { error } = await admin().from("billing_purchases").update({ asaas_customer_id: customerId, asaas_payment_id: String(payment.id), status: String(payment.status ?? "PENDING"), updated_at: new Date().toISOString() }).eq("id", purchaseId);
  if (error) throw Object.assign(new Error("billing_payment_reconciliation_failed"), { status: 502 });
  return payment;
}

async function ensurePurchaseRecord(userId: string, product: { code: string; name: string; credit_type: string; credits: number; price_cents: number }, customerId: string, externalReference: string) {
  const a = admin();
  const { data: existing, error: lookupError } = await a.from("billing_purchases").select("id,asaas_payment_id,status,credits_granted_at,product_key,product_name,credit_type,credits,amount,asaas_customer_id").eq("user_id", userId).eq("external_reference", externalReference).maybeSingle();
  if (lookupError) throw Object.assign(new Error("billing_purchase_lookup_failed"), { status: 500 });
  if (existing) return existing;
  const row = { user_id: userId, product_key: product.code, product_name: product.name, credit_type: product.credit_type, credits: product.credits, amount: Number(product.price_cents) / 100, asaas_customer_id: customerId, external_reference: externalReference, status: "PENDING" };
  const { data, error } = await a.from("billing_purchases").insert(row).select("id,asaas_payment_id,status,credits_granted_at,product_key,product_name,credit_type,credits,amount,asaas_customer_id").single();
  if (!error) return data;
  if (String(error.code ?? "") === "23505") {
    const { data: raced } = await a.from("billing_purchases").select("id,asaas_payment_id,status,credits_granted_at,product_key,product_name,credit_type,credits,amount,asaas_customer_id").eq("user_id", userId).eq("external_reference", externalReference).maybeSingle();
    if (raced) return raced;
  }
  throw Object.assign(new Error("billing_purchase_intent_failed"), { status: 500 });
}

async function reconcileSubscription(externalReference: string, userId: string, plan: string, customerId: string) {
  const result = await asaasJson(`/subscriptions?externalReference=${encodeURIComponent(externalReference)}&limit=10`);
  const subscription = (result?.data?.[0] ?? null) as AsaasSubscription | null;
  if (!subscription?.id) return null;
  const nextDueDate = String(subscription.nextDueDate ?? new Date().toISOString().slice(0, 10));
  const { data: existing } = await admin().from("billing_subscriptions").select("id,asaas_subscription_id,status,plan").eq("user_id", userId).eq("external_reference", externalReference).maybeSingle();
  if (existing) return subscription;
  const { error } = await admin().from("billing_subscriptions").insert({ user_id: userId, plan, asaas_customer_id: customerId, asaas_subscription_id: String(subscription.id), external_reference: externalReference, status: String(subscription.status ?? "ACTIVE"), trial_ends_at: nextDueDate });
  if (error && String(error.code ?? "") !== "23505") throw Object.assign(new Error("billing_subscription_reconciliation_failed"), { status: 502 });
  return subscription;
}

async function reconcileSubscriptionWebhook(subscription: AsaasSubscription) {
  const subscriptionId = String(subscription.id ?? "");
  if (!subscriptionId) return false;
  const a = admin();
  const { data: current } = await a.from("billing_subscriptions").select("id").eq("asaas_subscription_id", subscriptionId).maybeSingle();
  if (current) return true;
  const reference = String(subscription.externalReference ?? "");
  const match = /^marcenapp:subscription:([^:]+):([^:]+):([^:]+)$/.exec(reference);
  if (!match) return false;
  const [, userId, plan] = match;
  const { data: planRow } = await a.from("billing_plans").select("code").eq("code", plan).maybeSingle();
  if (!planRow) return false;
  const customerId = String(subscription.customer ?? "");
  if (!customerId) return false;
  const nextDueDate = String(subscription.nextDueDate ?? new Date().toISOString().slice(0, 10));
  const { error } = await a.from("billing_subscriptions").insert({ user_id: userId, plan, asaas_customer_id: customerId, asaas_subscription_id: subscriptionId, external_reference: reference, status: String(subscription.status ?? "ACTIVE"), trial_ends_at: nextDueDate });
  if (error && String(error.code ?? "") !== "23505") throw Object.assign(new Error("billing_subscription_webhook_reconciliation_failed"), { status: 500 });
  return true;
}

async function reconcilePaymentWebhook(payment: AsaasPayment) {
  const paymentId = String(payment.id ?? "");
  if (!paymentId) return false;
  const a = admin();
  const { data: existing } = await a.from("billing_purchases").select("id").eq("asaas_payment_id", paymentId).maybeSingle();
  if (existing) return true;
  const reference = String(payment.externalReference ?? "");
  const match = /^marcenapp:product:([^:]+):([^:]+):([^:]+)$/.exec(reference);
  if (!match) return false;
  const [, productKey, userId] = match;
  const product = await getActiveProduct(productKey);
  const customerId = String(payment.customer ?? "");
  if (!customerId) return false;
  const { data: intent } = await a.from("billing_purchases").select("id").eq("user_id", userId).eq("external_reference", reference).maybeSingle();
  if (intent) {
    const { error } = await a.from("billing_purchases").update({ asaas_customer_id: customerId, asaas_payment_id: paymentId, status: String(payment.status ?? "PENDING"), updated_at: new Date().toISOString() }).eq("id", intent.id);
    if (error) throw Object.assign(new Error("billing_payment_webhook_reconciliation_failed"), { status: 500 });
    return true;
  }
  const { error } = await a.from("billing_purchases").insert({ user_id: userId, product_key: product.code, product_name: product.name, credit_type: product.credit_type, credits: product.credits, amount: Number(product.price_cents) / 100, asaas_customer_id: customerId, asaas_payment_id: paymentId, external_reference: reference, status: String(payment.status ?? "PENDING") });
  if (error && String(error.code ?? "") !== "23505") throw Object.assign(new Error("billing_payment_webhook_reconciliation_failed"), { status: 500 });
  return true;
}

async function processWebhook(h: Record<string, string>, body: Record<string, unknown>, receivedToken: string | undefined) {
  const expected = Deno.env.get("ASAAS_WEBHOOK_TOKEN")?.trim();
  if (!expected || !receivedToken || expected !== receivedToken) return json(h, { error: "Webhook não autorizado." }, 401);
  const event = body.event as Record<string, unknown> | undefined;
  if (!event?.id || !event?.event) return json(h, { error: "Evento Asaas inválido." }, 400);
  const a = admin(), payment = (event.payment ?? {}) as AsaasPayment, subscription = (event.subscription ?? {}) as AsaasSubscription;
  const subscriptionId = payment.subscription ?? subscription.id ?? null;
  const { error } = await a.from("asaas_webhook_events").insert({ event_id: String(event.id), event_type: String(event.event), payment_id: payment.id ?? null, customer_id: payment.customer ?? subscription.customer ?? null, subscription_id: subscriptionId, payload: event });
  const duplicate = Boolean(error && (String(error.code ?? "") === "23505" || String(error.message).toLowerCase().includes("duplicate")));
  if (error && !duplicate) return json(h, { error: "Não foi possível registrar o webhook." }, 500);
  if (subscription.id) {
    await reconcileSubscriptionWebhook(subscription);
    await a.from("billing_subscriptions").update({ status: String(subscription.status ?? "ACTIVE"), updated_at: new Date().toISOString() }).eq("asaas_subscription_id", String(subscription.id));
  }
  if (payment.id) {
    await reconcilePaymentWebhook(payment);
    const status = String(payment.status ?? event.event ?? "PENDING");
    const receivedStatus = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(status) || event.event === "PAYMENT_RECEIVED";
    const { data: processed, error: processError } = await a.rpc("process_billing_payment", { p_payment_id: String(payment.id), p_status: status, p_received: receivedStatus });
    if (processError) return json(h, { error: "Não foi possível processar a compra." }, 500);
    return json(h, { received: true, duplicate, processed: Boolean(processed) });
  }
  return json(h, { received: true, duplicate, processed: false });
}

serve(async (req) => {
  const h = cors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: h });
  try {
    const body = await readBody(req);
    const action = String(body.action ?? "");
    if (action === "webhook") {
      if (req.method !== "POST") return json(h, { error: "Method not allowed" }, 405);
      return await processWebhook(h, body, req.headers.get("asaas-access-token")?.trim());
    }

    const user = await requireUser(req);
    if (!user) return json(h, { error: "Autenticação necessária." }, 401);

    if (action === "connection_status") {
      if (!apiKey()) return json(h, { connected: false, configured: false, environment: Deno.env.get("ASAAS_ENVIRONMENT") ?? "sandbox" });
      await asaasJson("/customers?limit=1");
      return json(h, { connected: true, configured: true, environment: Deno.env.get("ASAAS_ENVIRONMENT") ?? "sandbox" });
    }

    if (action === "create_customer") {
      const customer = await ensureCustomer(user);
      const full = await asaasJson(`/customers/${encodeURIComponent(customer.id)}`);
      return json(h, { customer: full, reused: customer.reused });
    }

    if (action === "create_product_payment") {
      const key = String(body.productKey ?? "").trim();
      const product = await getActiveProduct(key);
      const customer = String(body.customerId ?? "").trim();
      if (!customer || !await ownsCustomer(user.id, customer)) return json(h, { error: "Cliente de cobrança inválido." }, 403);
      const billingType = String(body.billingType ?? "UNDEFINED");
      if (!BILLING_TYPES.includes(billingType as typeof BILLING_TYPES[number])) return json(h, { error: "Forma de pagamento inválida." }, 400);
      const idempotencyKey = String(body.idempotencyKey ?? "").trim();
      if (!idempotencyKey || idempotencyKey.length > 128) return json(h, { error: "idempotencyKey é obrigatório." }, 400);
      const externalReference = `marcenapp:product:${key}:${user.id}:${idempotencyKey}`;
      const intent = await ensurePurchaseRecord(user.id, product, customer, externalReference);
      if (intent.asaas_payment_id) {
        const payment = await asaasJson(`/payments/${encodeURIComponent(String(intent.asaas_payment_id))}`) as AsaasPayment;
        return json(h, { payment, product, reused: true });
      }
      const recovered = await reconcilePayment(externalReference, String(intent.id), customer);
      if (recovered) return json(h, { payment: recovered, product, reused: true });
      const payment = await asaasJson("/payments", { method: "POST", body: JSON.stringify({ customer, billingType, value: Number(product.price_cents) / 100, dueDate: body.dueDate ?? new Date().toISOString().slice(0, 10), description: product.name, externalReference, callback: { successUrl: "https://www.marcenapp.com.br/?module=billing&payment=success", autoRedirect: true } }) }) as AsaasPayment;
      if (!payment?.id) throw Object.assign(new Error("asaas_payment_missing_id"), { status: 502 });
      const { error: persistError } = await admin().from("billing_purchases").update({ asaas_payment_id: String(payment.id), asaas_customer_id: customer, status: String(payment.status ?? "PENDING"), updated_at: new Date().toISOString() }).eq("id", intent.id);
      if (persistError) {
        const reconciled = await reconcilePayment(externalReference, String(intent.id), customer);
        if (!reconciled) return json(h, { error: "Cobrança criada no Asaas e aguardando reconciliação segura. Reenvie a mesma operação para concluir o vínculo." }, 502);
        return json(h, { payment: reconciled, product, reused: true });
      }
      return json(h, { payment, product, reused: false });
    }

    if (action === "get_wallet") {
      const { data, error } = await admin().from("billing_wallets").select("image_credits,contract_credits,cut_plan_credits,marcena_credits,updated_at").eq("user_id", user.id).maybeSingle();
      if (error) return json(h, { error: "Não foi possível carregar seus créditos." }, 500);
      return json(h, { wallet: data ?? { image_credits: 0, contract_credits: 0, cut_plan_credits: 0, marcena_credits: 0 } });
    }

    if (action === "create_subscription") {
      const customer = String(body.customerId ?? "").trim(), plan = String(body.plan ?? "").toLowerCase(), idempotencyKey = String(body.idempotencyKey ?? "").trim();
      if (!customer || !idempotencyKey || idempotencyKey.length > 128) return json(h, { error: "Cliente e idempotencyKey válidos são obrigatórios." }, 400);
      if (!await ownsCustomer(user.id, customer)) return json(h, { error: "Cliente de cobrança não pertence à sua conta." }, 403);
      const billingType = String(body.billingType ?? "UNDEFINED");
      if (!BILLING_TYPES.includes(billingType as typeof BILLING_TYPES[number])) return json(h, { error: "Forma de pagamento inválida." }, 400);
      const { data: planRow, error: planError } = await admin().from("billing_plans").select("code,name,monthly_price_cents,status,features").eq("code", plan).eq("status", "active").maybeSingle();
      if (planError) return json(h, { error: "Não foi possível validar o plano." }, 500);
      if (!planRow?.monthly_price_cents || Number(planRow.monthly_price_cents) <= 0) return json(h, { error: "Plano não está disponível para compra." }, 409);
      const externalReference = `marcenapp:subscription:${user.id}:${plan}:${idempotencyKey}`;
      const recovered = await reconcileSubscription(externalReference, user.id, plan, customer);
      if (recovered) return json(h, { subscription: recovered, plan: planRow, reused: true });
      const value = Number(planRow.monthly_price_cents) / 100;
      const nextDueDate = String(body.nextDueDate ?? new Date().toISOString().slice(0, 10));
      const subscription = await asaasJson("/subscriptions", { method: "POST", body: JSON.stringify({ customer, billingType, value, cycle: "MONTHLY", nextDueDate, description: String(planRow.name).slice(0, 500), externalReference, callback: { successUrl: "https://www.marcenapp.com.br/?module=billing&payment=success", autoRedirect: true } }) }) as AsaasSubscription;
      if (!subscription?.id) throw Object.assign(new Error("asaas_subscription_missing_id"), { status: 502 });
      const { error: persistError } = await admin().from("billing_subscriptions").insert({ user_id: user.id, plan, asaas_customer_id: customer, asaas_subscription_id: String(subscription.id), external_reference: externalReference, status: String(subscription.status ?? "ACTIVE"), trial_ends_at: nextDueDate });
      if (persistError) {
        const reconciled = await reconcileSubscription(externalReference, user.id, plan, customer);
        if (!reconciled) return json(h, { error: "Assinatura criada no Asaas e aguardando reconciliação segura. Reenvie a mesma operação para concluir o vínculo." }, 502);
        return json(h, { subscription: reconciled, plan: planRow, reused: true });
      }
      return json(h, { subscription, plan: planRow, reused: false });
    }

    if (action === "get_payment" || action === "get_pix_qr") {
      const paymentId = String(body.paymentId ?? "").trim();
      if (!paymentId) return json(h, { error: "paymentId é obrigatório." }, 400);
      const payment = await asaasJson(`/payments/${encodeURIComponent(paymentId)}`) as AsaasPayment;
      const customerId = String(payment?.customer ?? "");
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
