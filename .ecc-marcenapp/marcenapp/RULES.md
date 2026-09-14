# Marcenapp Engineering Rules

These rules extend the pinned ECC snapshot. They do not replace Marcenapp's runtime architecture.

## Always

- Preserve the existing IARA domain layer and technical agent registry.
- Preserve the single technical orchestrator and existing tool registry.
- Preserve Client -> Project -> Environment -> Version context isolation.
- Preserve the single render pipeline.
- Validate TypeScript, lint, unit tests and relevant Playwright/E2E tests before release claims.
- Treat Supabase RLS/auth/security as release-critical.
- Review async/concurrent flows for stale responses and cross-project contamination.
- Keep changes narrow, reversible and attributable.
- Prefer fixing root causes over adding fallback/parallel systems.
- Verify production behavior only after CI/release gates pass.

## Never

- Create a second IARA.
- Create a second orchestrator or technical registry.
- Create a second render pipeline.
- Bypass auth, RLS, generation/context guards or security validation.
- Invent measurements, prices, materials, metrics, testimonials, integrations or guarantees.
- Mark a release ready because code merely compiles.
- Apply production database migrations as a side effect of an unrelated change.
- Auto-sync ECC upstream during normal development.
- Introduce an ECC customization directly into the vendored upstream snapshot.

## Required workflow

`plan -> baseline/evidence -> test -> implement -> fresh-context review -> verify -> release gate`

## Marcenapp risk order

1. Data/context isolation
2. Security/auth/RLS
3. AI execution correctness
4. Render correctness and persistence
5. Billing correctness
6. E2E critical paths
7. Build/type/lint
8. UX/visual polish

## Completion rule

An agent must report concrete evidence: files changed, tests run, relevant failures, and the final verification state. Do not claim success from static inspection alone when runtime evidence is required.
