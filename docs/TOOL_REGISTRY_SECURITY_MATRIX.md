# Tool Registry — Security and Trust-Boundary Matrix

| Tool | Read-only | Data mutation | External cost | Credit required | Server-side execution | Authorization | Idempotency |
|---|---|---|---|---|---|---|---|
| `createCliente` | No | Yes, own tenant | No | No | Supabase/RLS | JWT + ownership RLS | Not required by current business rule |
| `createProjeto` | No | Yes, own tenant | No | No | Supabase/RLS | JWT + ownership RLS + explicit dimension confirmation | Not required by current business rule |
| `gerarRender` | No | Queue mutation + external AI request | Yes | Yes when commercial rule exists | AI call is server-side through `ai-image`; billing guard is server-side | JWT + rate limit + commercial rule + wallet lock | Stable OS command id propagated to `ai-image` |
| `calcularOrcamento` | Yes | No | No | No | Read via Supabase/RLS | JWT + ownership RLS | Not required |
| `gerarContrato` | No | Server persists generated clause | Yes | Yes when commercial rule exists | AI + persistence server-side through `commercial-contract` | JWT + rate limit + commercial rule + wallet lock | One idempotency key per server request; failures refund |
| `operational_intelligence` | Yes | Writes tenant-scoped operational records/alerts | No | No | Analysis RPC is server-side; UI writes are RLS-protected | JWT + tenant ownership RLS; RPC verifies project owner via `auth.uid()` | Requirements unique per tenant/project/item; alert refresh is scoped to the same project/source |

## Operational Intelligence boundary

- `marcenaria_dna` is one row per authenticated user and is never shared across tenants.
- `project_cost_snapshots` stores only costs explicitly supplied by the tenant; the intelligence layer does not invent prices, labor costs, margins, or supplier values.
- `hardware_items`, `hardware_stock`, `hardware_purchases`, `project_hardware_requirements`, `project_production_stages`, `project_sales`, `project_receivables`, and `project_expenses` are tenant-scoped and RLS-protected.
- Hardware quantities are calculated only from explicit DNA `construction_rules.hardware_rules` entries using `fixed_quantity` or `quantity_per_unit` against real project `doors`, `drawers`, or `modules`. Missing rules produce `HARDWARE_RULE_MISSING`; no quantity is fabricated.
- `refresh_project_operational_alerts` preserves the established margin/MDF checks and additionally invokes hardware, production, and financial rule engines. It is `SECURITY DEFINER`, fixes `search_path`, requires a JWT, verifies project ownership, and is executable only by `authenticated`.
- Operational alerts carry source, evidence and suggested action so IARA can explain why an alert exists.
- Missing configuration produces explicit states such as `Regra não configurada`, `PROFIT_NOT_CALCULABLE`, `SUPPLIER_MISSING`, `PRODUCTION_RULE_MISSING` or `SALE_RECORD_MISSING` instead of invented values.

## Rules

- The AI orchestrator may select a tool, but never grants commercial authorization.
- The browser may request an operation, but commercial authorization is performed by Supabase/Edge Functions.
- Missing commercial rules fail closed with `commercial_rule_missing`.
- Credit costs are never inferred from monetary prices.
- Operational Intelligence never bypasses RLS, billing, rate limits, or Tool Registry authorization.
- Project operations never write platform billing or credit state.
- MDF rules remain tenant-configured; the existing project interpretation of 5 mm as 6 mm is not overwritten by the intelligence layer.
