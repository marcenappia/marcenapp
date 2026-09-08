---
name: official-supabase
description: Supabase database, Auth, Storage, Edge Functions and RLS guidance.
---

# Supabase

Canonical upstream: https://github.com/supabase/agent-skills — skill `supabase`.

Use for any Supabase task. Verify current Supabase documentation before implementation and verify database changes after applying them.

MARCENAPP rules:
- Keep RLS enabled on exposed tables.
- Never expose service-role secrets to the browser.
- Authorization must use app-level role data, not user-editable metadata.
- Do not add a second Supabase skill with overlapping triggers; extend the registry instead.
