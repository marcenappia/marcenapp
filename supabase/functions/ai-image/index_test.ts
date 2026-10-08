import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import "https://deno.land/std@0.224.0/dotenv/load.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const FN_URL = `${SUPABASE_URL}/functions/v1/ai-image`;
type ApiJson = { code?: string; fields?: Record<string, unknown> };

async function call(body: BodyInit, headers: Record<string, string> = {}) {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      ...headers,
    },
    body,
  });
  const text = await res.text();
  let json: ApiJson = {};
  try { json = JSON.parse(text) as ApiJson; } catch { /* keep empty response object */ }
  return { status: res.status, json, text };
}

Deno.test("ai-image: 400 for missing prompt (empty body)", async () => {
  const { status, json } = await call(JSON.stringify({}));
  assertEquals(status, 400);
  assertEquals(json.code, "validation_error");
  assert(json.fields?.prompt, "expected prompt field error");
});

Deno.test("ai-image: 400 for whitespace-only prompt", async () => {
  const { status, json } = await call(JSON.stringify({ prompt: "    \n\t  " }));
  assertEquals(status, 400);
  assertEquals(json.code, "validation_error");
  assert(json.fields?.prompt, "expected prompt field error");
});

Deno.test("ai-image: 400 for invalid size (too small)", async () => {
  const { status, json } = await call(
    JSON.stringify({ prompt: "a cat", size: { width: 10, height: 10 } }),
  );
  assertEquals(status, 400);
  assertEquals(json.code, "validation_error");
  assert(json.fields?.size, "expected size field error");
});

Deno.test("ai-image: 400 for invalid mimeType", async () => {
  const { status, json } = await call(
    JSON.stringify({
      prompt: "edit this",
      images: [{ mimeType: "application/pdf", data: "abc" }],
    }),
  );
  assertEquals(status, 400);
  assertEquals(json.code, "validation_error");
  assert(json.fields?.images, "expected images field error");
});

Deno.test("ai-image: 400 for too many images (>8)", async () => {
  const images = Array.from({ length: 9 }, () => ({
    mimeType: "image/png",
    data: "aGVsbG8=",
  }));
  const { status, json } = await call(JSON.stringify({ prompt: "merge", images }));
  assertEquals(status, 400);
  assertEquals(json.code, "validation_error");
  assert(json.fields?.images, "expected images field error");
});

Deno.test("ai-image: 400 for malformed JSON", async () => {
  const { status, json } = await call("{not-json");
  assertEquals(status, 400);
  assertEquals(json.code, "invalid_json");
});
Deno.test("ai-image: provider contract stays buffered and uses supported model", async () => {
  const source = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  assert(source.includes('const LOVABLE_IMAGE_MODEL = "openai/gpt-image-2";'));
  assert(!source.includes("gpt-image-2.5-sunburst"));
  assert(source.includes("data?.[0]"));
  assert(source.includes("b64_json"));
  assert(source.includes("image?.url"));
  assert(!source.includes("readImageStream("));
});

Deno.test("ai-image: does not double-wrap data URI returned by image decoder", async () => {
  const source = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  assert(source.includes("imageUrl: imageBase64"));
  assert(!source.includes("imageUrl: `data:image/png;base64,${imageBase64}`"));
});

Deno.test("ai-image: validates IARA execution context before consuming the operation", async () => {
  const source = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  const validation = source.indexOf("[EXECUTION_CONTEXT_VALIDATED]");
  const consumption = source.indexOf('admin.rpc("consume_billing_credit"');
  assert(validation >= 0, "expected pre-consumption context validation");
  assert(consumption >= 0, "expected operation consumption");
  assert(validation < consumption, "context must be validated before consumption");
});

Deno.test("ai-image: refunds when durable gallery persistence fails after generation", async () => {
  const source = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  assert(source.includes("persistGalleryRequired && !persisted"), "expected persistence-aware refund guard");
  assert(source.includes('persistGalleryRequired = Boolean(persistGallery)'), "expected any persistence request to be refundable");
});

Deno.test("ai-image: bounds the real image provider path", async () => {
  const source = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  assert(source.includes("[LOVABLE_IMAGE_ATTEMPT]"), "expected bounded provider retry logging");
  assert(source.includes("55_000"), "expected provider timeout");
});

Deno.test("ai-image: builds a deterministic scene-preservation prompt for reference renders", async () => {
  const source = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  assert(source.includes("RENDER DE MARCENARIA FOTORREALISTA"));
  assert(source.includes("Preserve a arquitetura, enquadramento, proporções"));
  assert(source.includes("INSTRUÇÃO DO USUÁRIO:"));
  assert(source.includes("const providerPrompt = buildRenderPrompt"));
  assert(source.includes("generateImage(provider, providerPrompt"));
});

Deno.test("ai-image: provider fallback remains centralized in provider resolver", async () => {
  const providerSource = await Deno.readTextFile(new URL("./provider.ts", import.meta.url));
  const imageSource = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  assert(providerSource.includes("fallback"));
  assert(imageSource.includes("resolution.fallback"));
});
