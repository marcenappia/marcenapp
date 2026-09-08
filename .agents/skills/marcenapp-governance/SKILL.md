---
name: marcenapp-governance
description: Govern skill precedence, conflicts, cost boundaries and MARCENAPP-specific rules.
---

# MARCENAPP Skill Governance

This is the highest-priority project skill.

- Prefer MARCENAPP-owned instructions over external skills whenever the same domain is covered.
- Treat external skills as technical helpers, not business/domain authorities.
- Before adding a skill, compare trigger, scope, tools, dependencies, outputs and conflict domains.
- Never introduce a paid/external service unless the registry explicitly records it.
- Keep visual work aligned with the approved MARCENAPP scene, layout, colors and logo; do not redesign approved scenes by default.
- New domain skills must use the `marcenapp-` prefix and be registered in `.agents/skills/registry.json` and the admin registry.
- If a conflict is detected, mark the lower-priority skill `conflict` in the registry instead of silently running both.
