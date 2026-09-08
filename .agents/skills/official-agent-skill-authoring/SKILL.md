---
name: official-agent-skill-authoring
description: Guidance for creating modular, progressive-disclosure agent skills without duplication.
---

# Agent Skill Authoring

Canonical upstream: https://github.com/supabase/agent-skills — skill `skill-creator`.

Before creating a skill:
1. Search the existing MARCENAPP registry.
2. Compare trigger, scope, tools, dependencies and conflict domains.
3. Reuse an existing skill when the behavior is already covered.
4. Create a focused `SKILL.md` with clear triggers and boundaries.
5. Register the skill in `.agents/skills/registry.json` and the Supabase admin registry.

MARCENAPP-owned domain skills use the `marcenapp-` prefix and take precedence over vendor guidance.
