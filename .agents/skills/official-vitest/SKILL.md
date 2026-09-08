---
name: official-vitest
description: Unit and component testing guidance using the repository's existing Vitest setup.
---

# Vitest

Canonical upstream: https://github.com/supabase/supabase — skill `vitest`.

Use for unit tests, mocks and coverage. The repository already has Vitest configured, so do not replace the test framework.

MARCENAPP rules:
- Add focused regression coverage for new behavior.
- Keep tests deterministic and independent of paid external APIs.
- Pair important user-visible behavior with an appropriate E2E check when browser state matters.
