# Tool Registry — Security and Trust-Boundary Matrix

| Tool | Read-only | Data mutation | External cost | Credit required | Server-side execution | Authorization | Idempotency |
|---|---|---|---|---|---|---|---|
| `createCliente` | No | Yes, own tenant | No | No | Supabase/RLS | JWT + ownership RLS | Not required by current business rule |
| `createProjeto` | No | Yes, own tenant | No | No | Supabase/RLS | JWT + ownership RLS + explicit dimension confirmation | Not required by current business rule |
| `gerarRender` | No | Queue mutation + external AI request | Yes | Yes when commercial rule exists | AI call is server-side through `ai-image`; billing guard is server-side | JWT + rate limit + commercial rule + wallet lock | Stable OS command id propagated to `ai-image` |
| `calcularOrcamento` | Yes | No | No | No | Read via Supabase/RLS | JWT + ownership RLS | Not required |
| `gerarContrato` | No | Server persists generated clause | Yes | Yes when commercial rule exists | AI + persistence server-side through `commercial-contract` | JWT + rate limit + commercial rule + wallet lock | One idempotency key per server request; failures refund |
| `operational_intelligence` | Yes | Writes tenant-scoped alerts/cost snapshots through authenticated Supabase paths | No | No | Analysis RPC is server-side; UI writes are RLS-protected | JWT + tenant ownership RLS; RPC verifies project owner via `auth.uid()` | Snapshot is unique per `(user_id, project_id)`; alert refresh replaces only open alerts for that project |

## Operational Intelligence boundary

- `marcenaria_dna` is one row per authenticated user and is never shared across tenants.
- `project_cost_snapshots` stores only costs explicitly supplied by the tenant; the intelligence layer does not invent prices, labor costs, margins, or supplier values.
- `refresh_project_operational_alerts` is `SECURITY DEFINER`, fixes `search_path`, requires a JWT, verifies that the target project belongs to `auth.uid()`, and is executable only by `authenticated`.
- `operational_alerts` is tenant-scoped with RLS. Alert evidence records the source values used by the rule so IARA can explain why an alert exists.
- Missing DNA or incomplete cost data produces an explicit informational state instead of an invented number.

## Rules

- The AI orchestrator may select a tool, but never grants commercial authorization.
- The browser may request an operation, but commercial authorization is performed by Supabase/Edge Functions.
- Missing commercial rules fail closed with `commercial_rule_missing`.
- Credit costs are never inferred from monetary prices.
- New commercial rules must be configured by an administrator through the protected billing rules interface.
- Operational Intelligence never bypasses RLS, billing, rate limits, or Tool Registry authorization.
