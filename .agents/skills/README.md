# Marcenapp Agent Skills

This directory contains the agent skills owned by Marcenapp and versioned with the repository.

## Ownership rule

The repository is the source of truth for Marcenapp-owned skills.

External skill catalogs, repositories, and managers can be consulted for discovery or ideas, but they are not runtime dependencies of Marcenapp. An upstream project changing, disappearing, renaming, or releasing a new version must not silently change this repository's agent behavior.

## Update policy

An external skill may be incorporated only through an intentional review:

1. inspect the external material;
2. identify the useful capability;
3. adapt it to Marcenapp's architecture and business boundaries;
4. keep the implementation inside this repository;
5. validate the affected workflows;
6. commit the deliberate change.

Do not auto-sync upstream skills.

## Current internal skills

- `marcenapp-master` — repository-level forensic orchestration and change-set control.
- `marcenapp-frontend-design` — Marcenapp-owned frontend craft, visual quality, responsive behavior, accessibility, and UI-state guidance.

## Boundary

Skills are instructions for engineering agents. They must not become a second application architecture or a source of business rules.

In particular, agent skills must not silently redefine:

- IARA/domain/orchestrator architecture;
- Project ↔ IARA context and execution identity;
- Supabase/Auth/RLS/persistence contracts;
- Billing or commercial rules;
- product capabilities or promises;
- the existing design-system source of truth.

Any change that crosses one of these boundaries belongs to the appropriate engineering owner and must be validated as such.
