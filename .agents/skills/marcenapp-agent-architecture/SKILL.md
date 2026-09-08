---
name: marcenapp-agent-architecture
description: Authoritative MARCENAPP rules for the specialist-agent bank, dependencies, evidence contracts and blocking behavior.
---

# MARCENAPP Agent Architecture

The MARCENAPP specialist-agent architecture is the domain authority. External skills may improve implementation, but may not redefine the agent roles, dependency graph, evidence contract or blocking rules.

Authoritative source: `docs/agentes-marcenapp.md` and `src/lib/agents/registry.ts` on the synchronized product baseline.

Rules:
- Keep the existing customer → project → technical validation → presentation/approval → budget/production journey.
- Do not create a second agent hierarchy when a MARCENAPP agent already owns the domain.
- Evidence must distinguish observed, measured, calibrated, estimated and unknown information where applicable.
- Conflicting evidence must warn or block; never choose silently.
- Cut optimization and cut audit are separate responsibilities; an audit must not claim mathematical optimality.
- Render consumes validated technical data and must not silently change measurements or engineering to make an image prettier.
- New MARCENAPP domain behavior must be attached to the narrowest existing agent before a new agent is proposed.
