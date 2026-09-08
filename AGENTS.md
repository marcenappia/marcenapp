# MARCENAPP Agent Skills

## Precedence and conflict policy

1. `marcenapp-*` skills are the domain authority for MARCENAPP-specific rules, workflows, terminology, visual standards, business logic and approved behavior.
2. Official/vendor skills are supporting skills. They provide technical guidance only and must not override MARCENAPP domain rules.
3. When two skills cover the same trigger, prefer the higher-priority entry in `.agents/skills/registry.json` and the skill with the narrower domain.
4. Never install a second skill solely because it has a similar name. Compare triggers, scope, tools, dependencies and instructions first.
5. A skill must not call a paid/external service unless the registry explicitly records that dependency.
6. Local execution (tests, Playwright, TypeScript, lint and deterministic scripts) is classified separately from paid external API usage.
7. Visual changes must preserve the approved MARCENAPP scene/layout/color/logo standards unless the user explicitly requests a visual change.
8. New custom skills must use the `marcenapp-` prefix and be registered in `.agents/skills/registry.json` and the admin registry.

## Skill locations

- `.agents/skills/marcenapp-*`: MARCENAPP-owned domain skills.
- `.agents/skills/official-*`: thin adapters/policies for external official skills; canonical vendor content stays at its upstream source.
- `.agents/skills/registry.json`: versioned local registry and conflict policy.
- `src/modules/admin/AdminSkills.tsx`: admin visibility for the registry.
- `public.agent_skills_registry`: live Supabase registry used by the admin.

## Approved baseline

The initial baseline is GitHub, Supabase, Supabase Postgres Best Practices, Playwright, Vitest, Vercel React Best Practices, Agent Skill Authoring, and MARCENAPP Skill Governance.

Do not add Next.js-only skills to this Vite/React project unless the stack changes.