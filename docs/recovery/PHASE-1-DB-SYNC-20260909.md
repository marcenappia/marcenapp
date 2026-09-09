# MARCENAPP — Recovery Phase 1: Database Synchronization

## Result

- Recovery branch: `recovery/phase-0-1-db-sync-20260909`
- Baseline: `e824b2643720b4751b0406e96914d9999a12ca33`
- Phase 1 migration commit: `97e95906873cedfc6ae01ed1a3081d8010a096bf`
- Production migration name: `recovery_p0_database_sync`
- Production project: `uzhqhieqlcyncelltfjw`

## Root cause

The repository already contained contracts for `chat_messages`, `diario_entradas`, and `ai_provider_settings`, plus application code/types for `orchestrator_runs`, but the production schema/migration history did not contain those tables. The application and production database were therefore out of sync.

## Correction

Added one non-destructive, versioned migration:

`supabase/migrations/20260909150000_recovery_p0_database_sync.sql`

It restores the application contracts without dropping or deleting data:

- `chat_messages`: user ownership, project link, metadata, index, RLS, realtime publication.
- `diario_entradas`: project/user links, full entry fields, index, RLS, updated-at trigger.
- `ai_provider_settings`: per-user provider setting, provider check, RLS.
- `orchestrator_runs`: execution log fields, user ownership policy, index, updated-at trigger.

No additional foreign key was invented for `orchestrator_runs` because the existing application/type contract did not declare one.

## Production validation

Confirmed in production:

- all 4 tables exist;
- expected columns/defaults exist;
- expected indexes exist;
- RLS is enabled on all 4;
- policies are restricted to `authenticated` and `auth.uid() = user_id`;
- `chat_messages` is present in `supabase_realtime`;
- chat and diary project foreign keys are present in the table metadata;
- contract CRUD smoke test (insert → update → delete) succeeded for all applicable tables;
- smoke-test rows left behind: 0.

## Regression validation

GitHub Actions was run against the Phase 1 tree using a temporary `feat/recovery-validation-20260909` branch. Lint and build passed. Unit tests remained at the known pre-existing `89/90` state, failing only `src/test/Auth.test.tsx` on the reset-password countdown. This is not a Phase 1 regression and remains P0.5/P0.6 for Phase 3.

Playwright did not execute because the existing unit-test gate stopped the workflow.

## Safety

`main` was not modified. No DROP statements or data deletions were performed. The recovery branch is the continuation point for the next phase.
