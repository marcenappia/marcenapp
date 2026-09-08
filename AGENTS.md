# MARCENAPP Agent Skills

## Precedence and conflict policy

1. `marcenapp-*` skills are the domain authority for MARCENAPP-specific rules, workflows, terminology, visual standards, business logic and approved behavior.
2. `official-*` skills are technical support. They must not redefine MARCENAPP agents, business rules, evidence contracts or approved visual scenes.
3. `marcenapp-agent-architecture` governs the specialist-agent bank and its dependency/evidence/blocking model.
4. `marcenapp-scene-standards` governs approved scenes, layout, colors, logo, composition and render fidelity.
5. Technical skills are scoped by `agentScope`; they are not automatically active for every agent just because they are installed.
6. A skill's local slug and its upstream vendor slug are separate identifiers. The local slug is authoritative for this repository.
7. Never install a second skill solely because it has a similar name. Compare trigger, scope, tools, dependencies, outputs and conflict domains first.
8. A skill must not call a paid/external service unless the registry explicitly records that dependency.
9. Local execution (tests, Playwright, TypeScript, lint and deterministic scripts) is classified separately from paid external API usage.
10. Visual changes must preserve the approved MARCENAPP scene/layout/color/logo standards unless the user explicitly requests a visual change.
11. New custom skills must use the `marcenapp-` prefix and be registered in `.agents/skills/registry.json` and the admin registry.

## Important architecture boundary

The skills registry is **not** the agent registry.

- Agent architecture lives in `src/lib/agents/registry.ts` and its related agent code on the synchronized product baseline.
- Skill governance lives in `.agents/skills/registry.json`.
- A skill may support one or more agents, but it must not silently create a second agent hierarchy.
- If the current working branch does not contain the agent architecture present on `main`, flag that as a branch-sync divergence instead of inventing duplicate agents.

## Skill locations

- `.agents/skills/marcenapp-*`: MARCENAPP-owned domain skills.
- `.agents/skills/official-*`: thin adapters/policies for external official skills; canonical vendor content stays at its upstream source.
- `.agents/skills/registry.json`: versioned local registry, upstream mapping and conflict policy.
- `src/modules/admin/AdminSkills.tsx`: admin visibility for the registry.
- `public.agent_skills_registry`: live Supabase registry used by the admin.

## Approved baseline

MARCENAPP-owned:
- `marcenapp-governance`
- `marcenapp-agent-architecture`
- `marcenapp-scene-standards`

Official technical support:
- GitHub
- Supabase
- Supabase Postgres Best Practices
- Playwright Interactive
- Vitest
- Vercel React Best Practices
- Agent Skill Authoring

Do not add Next.js-only skills to this Vite/React project unless the stack changes.
