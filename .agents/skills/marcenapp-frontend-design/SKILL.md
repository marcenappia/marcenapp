---
name: marcenapp-frontend-design
version: 1.0.0
description: Marcenapp-owned frontend design and UI quality skill. Produces context-fit, professional, accessible, responsive interfaces while preserving Marcenapp business rules, architecture, and existing design-system source of truth.
metadata:
  internal: true
  ownership: marcenapp
  update_policy: manual
---

# MARCENAPP FRONTEND DESIGN — OWNED SKILL

## Purpose

This is the Marcenapp-owned frontend design capability. It is intentionally self-contained: it does not install, import, execute, fetch, or auto-update an external skill at runtime.

Its job is to help build or improve production frontend UI while preserving the product's existing behavior, architecture, visual language, and business boundaries.

The skill may be informed by external frontend-design practices, but external repositories are references only. The version committed here is the authoritative version for Marcenapp.

## Authority order

When guidance conflicts, follow this order:

1. Marcenapp Master and repository instructions.
2. Explicit product/business requirements already established by Marcenapp.
3. Existing Marcenapp design system, tokens, components, assets, and established UI conventions.
4. The affected feature's existing behavior and accessibility requirements.
5. This skill's frontend craft guidance.
6. External inspiration or upstream skill guidance — never authoritative and never automatically synchronized.

## Non-negotiable boundaries

Never use this skill to silently change:

- business rules or calculations;
- product promises, capabilities, pricing, Billing behavior, or commercial rules;
- Supabase schema, RLS, Auth, RPC, persistence contracts, or security boundaries;
- API contracts or server behavior;
- IARA, domain routing, orchestrator, tool registry, execution identity, or render architecture;
- another agent's owned subsystem without coordination;
- existing design-system foundations when a compatible primitive already exists.

If a frontend requirement genuinely needs a backend or business-rule change, stop at the frontend boundary and hand the work to the appropriate owner instead of smuggling the change into UI code.

Do not add a dependency merely to achieve a visual effect when the existing stack can provide it safely.

## When to use

Use for:

- new or substantially changed web pages and components;
- visual refinement of existing Marcenapp screens;
- layout, typography, hierarchy, spacing, surfaces, iconography, interaction states;
- responsive behavior and accessibility improvements that remain frontend-scoped;
- design-quality remediation found by Visual QA or forensic audits.

Do not use as a substitute for forensic debugging, backend/DB work, IARA work, or product/business decisions.

## Workflow

### 1. Inspect before changing

Read the affected route/component and its surrounding UI before designing.

Identify:

- the screen's primary job and user task;
- existing layout and interaction conventions;
- existing design-system tokens and primitives;
- typography and icon sources already used by the product;
- relevant states and responsive constraints;
- repository validation commands and browser verification paths.

Do not invent a new visual language when the repository already has one.

### 2. Define a context-fit direction

Choose a concise visual direction based on the actual Marcenapp context and the screen's job.

Prefer intentional, professional product UI over generic AI-generated patterns. Distinction should come from hierarchy, spacing, typography, information architecture, domain-relevant details, and disciplined component composition — not decorative effects for their own sake.

For Marcenapp, default toward:

- intelligent, modern, professional, human, direct, useful, confident presentation;
- clear information hierarchy for real marcenaria workflows;
- restrained visual noise;
- consistent and credible iconography;
- readable density appropriate to quoting, planning, production, and management tasks;
- strong feedback for actions, loading, success, error, empty, disabled, and degraded states.

Do not impose a new color palette, font family, radius system, icon library, or motion language without first checking the existing system and validating the global impact.

### 3. Reuse before creating

Prefer, in order:

1. existing shared component;
2. existing component variant;
3. existing design token;
4. small local composition using existing primitives;
5. a new shared primitive only when the pattern is genuinely reusable and its global impact is understood.

Avoid duplicate or near-duplicate components.

### 4. Build the complete UI state model

For interactive surfaces consider at least:

- default;
- hover where applicable;
- focus-visible;
- active/selected;
- disabled;
- loading;
- empty;
- validation/error;
- success/confirmation;
- offline/degraded behavior where relevant.

Never treat the happy path as the entire design.

### 5. Responsive behavior

Validate behavior, not merely CSS syntax.

Use the project's existing breakpoints when available. When a forensic audit needs explicit coverage, check representative widths including:

`320, 375, 390, 768, 1024, 1280, 1440`

Check for:

- overflow and clipping;
- unreachable controls;
- off-screen dialogs;
- broken tables/forms;
- navigation failures;
- unreadable density;
- touch targets and spacing;
- orientation changes;
- keyboard/focus behavior.

### 6. Accessibility

Treat accessibility as a release requirement, not polish.

Check:

- semantic structure;
- labels and accessible names;
- keyboard navigation;
- visible focus;
- meaningful button/link states;
- form errors and recovery guidance;
- sensible contrast and text sizing;
- reduced-motion behavior when motion exists;
- touch target usability.

Do not use visual styling that removes essential interaction feedback.

### 7. Iconography and visual credibility

Icons must look deliberate and consistent with the product.

Prefer the repository's established icon source. If icons need replacement, inspect the existing system first and change them coherently rather than mixing arbitrary styles.

Avoid icons that look improvised, inconsistent, decorative without meaning, or obviously machine-generated.

### 8. Motion

Use motion only when it improves comprehension, continuity, or feedback.

Avoid gratuitous animation, excessive transitions, perpetual motion, visual noise, and effects that compete with productive workflows.

### 9. Validation

For a code change, use the strongest applicable evidence:

1. targeted tests;
2. typecheck/lint/build;
3. browser execution;
4. console/network inspection;
5. responsive screenshots;
6. regression checks against nearby components.

A successful build does not prove visual or runtime correctness.

For visual changes, require rendered evidence when browser tooling is available.

## Change-safety protocol

Before editing shared UI:

- inspect the current branch and relevant open PRs;
- determine whether another change already owns the same area;
- preserve unrelated work;
- keep the change set focused;
- avoid broad refactors unless evidence requires them.

After editing:

- re-check affected states and breakpoints;
- verify no business or architecture boundary changed;
- compare against the existing design system;
- report evidence, not assumptions.

## Independence from external skills

This skill is a pinned Marcenapp artifact.

External skill managers such as `npx skills` may be used outside the application to discover ideas or inspect upstream material, but they are not a runtime dependency of Marcenapp.

Never:

- add an external skill package as a production dependency;
- add a remote import of an external `SKILL.md`;
- auto-sync this file from upstream;
- overwrite this file because an upstream repository changed;
- let an upstream skill change Marcenapp business logic or architecture.

If a future upstream update is useful, review it manually, adapt only the needed ideas, run the Marcenapp validation process, and commit the intentional change to this file.

## Completion gate

A frontend task is not complete merely because the code compiles.

Mark the work complete only when the intended UI behavior is implemented, relevant automated checks pass, rendered behavior is verified when applicable, responsive/accessibility requirements are covered, and no Marcenapp business or architecture boundary was silently changed.
