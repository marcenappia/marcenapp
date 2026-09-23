import { assertEquals, assertThrows } from "https://deno.land/std@0.168.0/assert/mod.ts";
import { resolveProviderSelection } from "./provider.ts";

Deno.test("automatic selects Lovable when available", () => {
  assertEquals(resolveProviderSelection("automatic", { lovable: true, gemini: true }), { primary: "lovable", fallback: "gemini" });
});

Deno.test("automatic selects Gemini when Lovable is unavailable", () => {
  assertEquals(resolveProviderSelection("automatic", { lovable: false, gemini: true }), { primary: "gemini", fallback: null });
});

Deno.test("explicit Lovable is respected and can fall back", () => {
  assertEquals(resolveProviderSelection("lovable", { lovable: true, gemini: true }), { primary: "lovable", fallback: "gemini" });
});

Deno.test("explicit Gemini is respected and can fall back", () => {
  assertEquals(resolveProviderSelection("gemini", { lovable: true, gemini: true }), { primary: "gemini", fallback: "lovable" });
});

Deno.test("explicit unavailable provider is rejected", () => {
  assertThrows(() => resolveProviderSelection("gemini", { lovable: true, gemini: false }), Error, "PROVIDER_NOT_CONFIGURED");
});

Deno.test("unconfigured with no operational provider is rejected", () => {
  assertThrows(() => resolveProviderSelection(undefined, { lovable: false, gemini: false }), Error, "PROVIDER_NOT_CONFIGURED");
});
