const cors = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const expected = Deno.env.get("ASAAS_WEBHOOK_TOKEN")?.trim();
    const received = req.headers.get("asaas-access-token")?.trim();
    if (!expected || !received || expected !== received) return json({ error: "Webhook não autorizado." }, 401);
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Configuração do servidor incompleta." }, 500);
    const event = await req.json();
    if (!event?.id || !event?.event) return json({ error: "Evento Asaas inválido." }, 400);

    const response = await fetch(`${url}/functions/v1/asaas`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "apikey": key,
        "Content-Type": "application/json",
        "asaas-access-token": received,
      },
      body: JSON.stringify({ action: "webhook", event }),
    });
    const payload = await response.json().catch(() => ({ error: "Resposta inválida do handler Asaas." }));
    return json(payload, response.status);
  } catch (error) {
    console.error("Asaas webhook bridge error", error);
    return json({ error: "Falha ao encaminhar webhook." }, 500);
  }
});

async function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(handler);
}
