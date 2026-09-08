---
name: official-supabase-postgres-best-practices
description: Postgres query, schema, index, concurrency and RLS performance guidance.
---

# Supabase Postgres Best Practices

Canonical upstream: https://github.com/supabase/agent-skills — skill `supabase-postgres-best-practices`.

Apply when writing or reviewing SQL, schema changes, indexes, RLS policies or database performance.

MARCENAPP rules:
- Preserve existing business schema unless the task requires a change.
- Prefer minimal migrations and indexed access paths backed by actual usage.
- Treat RLS as a security boundary, not merely a filter.
- MARCENAPP domain rules remain authoritative over generic optimization advice.
