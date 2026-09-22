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

## Useful commands
- `docker compose -f docker-compose.base44.yml logs -f web` — tail dev server logs
- `docker compose -f docker-compose.base44.yml restart web` — restart after config changes
- `npm run typecheck` / `npm run lint` / `npm run test` — validation (run inside the container)
