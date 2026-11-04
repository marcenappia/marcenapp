import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { providerAvailabilityFromEnv, resolveProviderSelection } from "./provider.ts";

const availability = (overrides: Partial<{ marcenaria_magica: boolean; lovable: boolean; gemini: boolean; vercel: boolean }> = {}) => ({
  marcenaria_magica: false,
  lovable: false,
  gemini: false,
  vercel: false,
  ...overrides,
});

Deno.test("automatic selects Lovable when available", () => {
  assertEquals(resolveProviderSelection("automatic", availability({ lovable: true, gemini: true })), { primary: "lovable", fallback: "gemini" });
});

Deno.test("automatic selects Gemini when Lovable is unavailable", () => {
  assertEquals(resolveProviderSelection("automatic", availability({ gemini: true })), { primary: "gemini", fallback: null });
});

Deno.test("explicit Lovable is respected and can fall back", () => {
  assertEquals(resolveProviderSelection("lovable", availability({ lovable: true, gemini: true })), { primary: "lovable", fallback: "gemini" });
});

Deno.test("explicit Gemini is respected and can fall back", () => {
  assertEquals(resolveProviderSelection("gemini", availability({ lovable: true, gemini: true })), { primary: "gemini", fallback: "lovable" });
});

Deno.test("automatic prefers Marcenaria Mágica for reference renders", () => {
  assertEquals(resolveProviderSelection("automatic", availability({ marcenaria_magica: true, lovable: true }), { requiresReference: true }), { primary: "marcenaria_magica", fallback: "lovable" });
});

Deno.test("explicit Marcenaria Mágica is selected only for reference renders", () => {
  assertEquals(resolveProviderSelection("marcenaria_magica", availability({ marcenaria_magica: true }), { requiresReference: true }), { primary: "marcenaria_magica", fallback: null });
  assertThrows(() => resolveProviderSelection("marcenaria_magica", availability({ marcenaria_magica: true }), { requiresReference: false }), Error, "PROVIDER_NOT_CONFIGURED");
});

Deno.test("the existing LOVABLE_API_KEY enables the native Marcenaria Mágica engine", () => {
  const withKey = providerAvailabilityFromEnv((name) => (name === "LOVABLE_API_KEY" ? "gateway-key" : undefined));
  assertEquals(withKey, { marcenaria_magica: true, lovable: true, gemini: false, vercel: false });
  const withoutKey = providerAvailabilityFromEnv(() => undefined);
  assertEquals(withoutKey.marcenaria_magica, false);
  assertEquals(withoutKey.lovable, false);
});

Deno.test("gateway credential keeps Marcenaria Mágica first for reference renders", () => {
  const availabilityFromEnv = providerAvailabilityFromEnv((name) => (name === "LOVABLE_API_KEY" ? "gateway-key" : undefined));
  assertEquals(resolveProviderSelection("automatic", availabilityFromEnv, { requiresReference: true }), { primary: "marcenaria_magica", fallback: "lovable" });
  assertEquals(resolveProviderSelection("automatic", availabilityFromEnv, { requiresReference: false }), { primary: "lovable", fallback: null });
});

Deno.test("explicit unavailable provider is rejected", () => {
  assertThrows(() => resolveProviderSelection("gemini", availability({ lovable: true })), Error, "PROVIDER_NOT_CONFIGURED");
});

Deno.test("unconfigured with no operational provider is rejected", () => {
  assertThrows(() => resolveProviderSelection(undefined, availability()), Error, "PROVIDER_NOT_CONFIGURED");
});
