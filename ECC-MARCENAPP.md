# ECC-MARCENAPP

## Purpose

ECC-MARCENAPP is the controlled engineering layer for Marcenapp. It vendors a pinned snapshot of the official Everything Claude Code (ECC) project and adds Marcenapp-specific rules, skills and workflows without replacing the existing Marcenapp architecture.

## Non-negotiable architecture rule

ECC-MARCENAPP is an engineering/control layer. It must never create a second Marcenapp runtime architecture.

It must not duplicate or replace:

- IARA
- the technical agent registry
- `src/core/orchestrator.ts`
- the existing tool registry
- Supabase AI services / Edge Functions
- the existing render pipeline
- Auth / Billing architecture

## Upstream policy

The official ECC repository is treated as upstream only:

- upstream: `https://github.com/affaan-m/ECC.git`
- pinned commit: `8321021c54d670126ce3b2969d5deb880b4b0c2a`
- upstream commit message: `fix(memory): classify directory traversal failures`

This is a fixed snapshot reference. Never update the vendored snapshot from upstream `main` implicitly.

## Operating model

Use the ECC workflow as the engineering discipline:

`plan -> test -> implement -> review -> verify -> remember -> improve`

For Marcenapp, the control layer must additionally validate:

1. IARA context isolation: client -> project -> environment -> version.
2. Existing agent registry/orchestrator ownership.
3. Render single-pipeline invariants.
4. Supabase/RLS/security invariants.
5. Billing/Auth isolation.
6. Playwright/E2E critical paths.
7. TypeScript/build/lint/test gates.
8. Vercel release integrity.
9. No invented product behavior, data, metrics, pricing, guarantees or integrations.
10. No changes that silently break another agent's responsibility.

## Safe integration policy

- Keep ECC vendored and versioned.
- Add Marcenapp-specific skills under `.ecc-marcenapp/marcenapp/skills/`.
- Add Marcenapp-specific agents under `.ecc-marcenapp/marcenapp/agents/`.
- Keep upstream ECC files separate from Marcenapp customizations.
- Upgrade ECC only through an explicit, reviewed sync.
- Never auto-pull upstream changes during normal development or CI.
- Do not merge or deploy this layer to production without normal Marcenapp release gates.
