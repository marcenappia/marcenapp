# MARCENAPP — Phase 2 Edge Function Alignment

Branch: `recovery/phase-0-1-db-sync-20260909`

## Production functions now active

- `ai-text` — active, JWT required, version 6
- `ai-image` — active, JWT required, version 5
- `ai-orchestrator` — active, JWT required, version 1
- `asaas` — active, JWT required, version 1
- `asaas-webhook` — active, JWT disabled intentionally because the external Asaas webhook authenticates with `asaas-access-token`; endpoint validates that secret before processing.

## Database dependencies restored for billing integration

The production database now contains the billing structures required by the Asaas functions:

- `billing_subscriptions`
- `billing_wallets`
- `billing_purchases`
- `asaas_webhook_events`

## Frontend integration

`src/services/ai.ts` was updated so `callAIText()` resolves the persisted provider preference and sends it to `ai-text` instead of displaying an Admin setting that is ignored by the request path.

## Validation limits

Production function metadata and deployed source were inspected after deployment. A valid authenticated production smoke test cannot be completed automatically in this environment because no authenticated user access token/browser session is available to the tooling. Unauthenticated protection can be verified from the function guard contract, but this is not a substitute for an authenticated end-to-end smoke test.

Asaas external credentials are server-side only. No secret values are committed or exposed here.
