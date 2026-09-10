# Tool Registry — Security and Trust-Boundary Matrix

| Tool | Read-only | Data mutation | External cost | Credit required | Server-side execution | Authorization | Idempotency |
|---|---|---|---|---|---|---|---|
| `createCliente` | No | Yes, own tenant | No | No | Supabase/RLS | JWT + ownership RLS | Not required by current business rule |
| `createProjeto` | No | Yes, own tenant | No | No | Supabase/RLS | JWT + ownership RLS + explicit dimension confirmation | Not required by current business rule |
| `gerarRender` | No | Queue mutation + external AI request | Yes | Yes when commercial rule exists | AI call is server-side through `ai-image`; billing guard is server-side | JWT + rate limit + commercial rule + wallet lock | Stable OS command id propagated to `ai-image` |
| `calcularOrcamento` | Yes | No | No | No | Read via Supabase/RLS | JWT + ownership RLS | Not required |
| `gerarContrato` | No | Server persists generated clause | Yes | Yes when commercial rule exists | AI + persistence server-side through `commercial-contract` | JWT + rate limit + commercial rule + wallet lock | One idempotency key per server request; failures refund |

## Rules

- The AI orchestrator may select a tool, but never grants commercial authorization.
- The browser may request an operation, but commercial authorization is performed by Supabase/Edge Functions.
- Missing commercial rules fail closed with `commercial_rule_missing`.
- Credit costs are never inferred from monetary prices.
- New commercial rules must be configured by an administrator through the protected billing rules interface.
