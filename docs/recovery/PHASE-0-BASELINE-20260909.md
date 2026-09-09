# MARCENAPP — Recovery Phase 0 Baseline

- Recovery branch: `recovery/phase-0-1-db-sync-20260909`
- Protected base branch: `main` (not modified)
- Recovery baseline commit: `e824b2643720b4751b0406e96914d9999a12ca33`
- Baseline commit message: `fix: make all auth entry paths resilient`
- Recovery started: 2026-09-09

## Safety rules

- No destructive DROP operations.
- No deletion of existing data.
- No changes directly on `main`.
- Preserve existing business rules and UI/layout.
- Advance phase-by-phase only after related validation.

This document records the immutable starting point for the recovery work. All subsequent recovery changes must be committed after validation on the recovery branch.
