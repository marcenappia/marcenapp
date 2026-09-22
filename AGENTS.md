# Marcenapp — Base44 Dev Environment

## What this is
A Vite + React 18 + TypeScript SPA ("Marcenapp") for woodworking shop management. Frontend-only; connects to a **remote Supabase** instance for auth, database, and edge functions. No local backend or database is needed.

## How it runs
- `docker-compose.base44.yml` — single `web` service using `node:22-slim`, source bind-mounted at `/app`, deps installed via `npm ci` at startup, Vite dev server on port 8080 (mapped to host 3000).
- Vite 6.4.3 — HMR is active; edits to source appear live without rebuilds.
- `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` is passed through from the platform env to allow the preview hostname.

## Environment variables
All Supabase vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) have **hardcoded fallbacks** in `src/integrations/supabase/client.ts`, so the app boots without any credentials. To use a different Supabase project, provide them via the Base44 secrets dashboard.
- `VITE_SUPPORT_WHATSAPP_LINK` — optional support link shown on the auth page.

## Verifying it works
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → `200`
- Vite dev server logs show `ready in <ms>` and serve transformed `.tsx` modules (not prebuilt bundles).

## IARA render pipeline (do not restructure)
IARA → gerarRender (toolRegistry) → useStudioStore.enqueueCommand → useMarcenappOS.dispatchCommand → StudioWorker → studioService.generateVisual → callAIImage → Supabase Edge Function `ai-image` → provider (gemini/lovable) → imageUrl → completeCommand → `generatedImage` → StudioView `<img>`.

Key invariants (enforced in `supabase/functions/ai-image/index.ts`):
- Persistence (`project_iara_contexts`, `gallery_images`) is best-effort — it must NEVER discard a generated image; failures log `[DATABASE_WRITE]` and the response returns `persisted: false`.
- The response reports the REAL `provider`/`model` used plus `fallbackUsed` — never hardcoded values.
- Edge functions deploy via GitHub Actions on push to `main` (`supabase-functions-deploy.yml`, needs the `SUPABASE_ACCESS_TOKEN` GitHub secret, project `uzhqhieqlcyncelltfjw`). Editing `supabase/functions/**` in a branch does NOT change the deployed function until merged+deployed.
- Provider credentials (`GOOGLE_GEMINI_API_KEY`, `LOVABLE_API_KEY`) are Supabase function secrets, not repo/Base44 env vars.
- The `gerarRender` billing rule is seeded by migration `20260910135214_seed_render_credit_rule_for_runtime.sql`.
- Pipeline tracing logs: `[IARA_START]` `[GENERAR_RENDER]` `[STUDIO_WORKER]` `[STUDIO_SERVICE]` `[AI_IMAGE_START]` `[PROVIDER_SELECTION]` `[UPSTREAM_REQUEST]` `[UPSTREAM_RESPONSE]` `[IMAGE_RECEIVED]` `[IMAGE_RETURN]` `[FRONTEND_RECEIVED]` `[IMAGE_RENDERED]` `[DATABASE_WRITE]` — never log keys/JWTs.

## Useful commands
- `docker compose -f docker-compose.base44.yml logs -f web` — tail dev server logs
- `docker compose -f docker-compose.base44.yml restart web` — restart after config changes
- `npm run typecheck` / `npm run lint` / `npm run test` — validation (run inside the container)
