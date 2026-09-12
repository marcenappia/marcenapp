# MARCENAPP — IARA/YARA PRODUCT & EXPERIENCE SPECIFICATION

**Status:** Product/Experience specification — no frontend implementation in this stage.

**Baseline audited:** `22754e8f70f31b1369c7e201abf3111f580e1c91` (`fix(agents): clean domain layer before validation`).

**Purpose:** define the canonical product experience of IARA as the single conversational entry point for the Marcenapp journey, while preserving the existing domain architecture and 20 technical agents.

---

## 1. EXECUTIVE PRODUCT DECISION

Marcenapp should not expose its internal agent architecture as the user's information architecture.

The user experiences **one IARA conversation**. IARA coordinates project, production, business and execution capabilities behind the scenes.

The primary experience is:

`entrada livre → conversa → decisão → artefato → contexto → próximo passo`

The product journey remains:

`foto/arquivo/mensagem → análise → projeto → visualização → revisão → aprovação → orçamento → pedido → produção → montagem → entrega`

The user may move non-linearly at any time. Suggested actions are accelerators, never mandatory wizard steps.

### Non-negotiable product principle

> **O usuário trabalha com um projeto. Ele não trabalha com módulos.**

The project is the durable context. IARA is the conversational coordinator. Domain specialists are implementation details unless surfacing a specialist adds useful confidence or explanation.

---

## 2. CURRENT AUDIT — WHAT EXISTS AND WHAT MUST BE PRESERVED

### Preserve

- The existing 20-agent technical registry and dependency model. The registry explicitly contains 20 technical agents and dependencies between them. (`src/lib/agents/registry.ts`)
- The domain layer that maps user intent to `project`, `production`, `business` and `execution`, exposing IARA as the top-level orchestrator and BENTO/ESTELA/JUCA as domain specialists. (`src/lib/agents/domain.ts`)
- Evidence/status semantics from the agent architecture: `completed`, `needs_input`, `failed`, plus evidence, warnings and blockers. (`docs/agentes-marcenapp.md`, `src/lib/agents/orchestrator.ts`)
- Project-scoped chat persistence already present in `useIaraChat`: messages are loaded from `chat_messages`, filtered by `project_id` when a project exists, and realtime inserts are subscribed to for that project. (`src/modules/iara/hooks/useIaraChat.ts`)
- Existing image attachment and browser speech input foundations. (`src/modules/iara/hooks/useIaraChat.ts`, `src/modules/iara/components/ChatInput.tsx`)
- Existing error/retry UI foundations. (`src/modules/iara/components/ChatMessages.tsx`)
- Existing studio/render command bus and project dimension synchronization. (`src/modules/iara/index.tsx`, `src/modules/ambientes/StudioHub.tsx`, `src/store/useMarcenappOS.ts`)
- Existing commercial and operational tool contracts. (`src/core/toolRegistry.ts`)
- Existing project journey concept and resumable project progress. (`src/modules/jornada/Home.tsx`, `src/modules/jornada/NovoProjeto.tsx`, `src/modules/jornada/types.ts`)

### Major current experience gaps

1. The active chat path still calls the older `src/core/orchestrator.ts` through `useIaraChat`, while the new domain experience is implemented separately in `src/lib/agents/domain.ts`. This means the new domain architecture is not yet the canonical UI execution path. **P0 integration gap.**
2. The IARA UI is currently embedded inside `StudioHub`, making IARA visually and conceptually subordinate to the Studio rather than the primary experience. (`src/modules/ambientes/StudioHub.tsx`)
3. `ChatInput` has attachment, microphone and send controls, but no Smart Action Button. (`src/modules/iara/components/ChatInput.tsx`)
4. `ChatMessages` supports text/image messages and a simple typing state, but has no first-class message/action/artifact model or contextual artifact panel. (`src/modules/iara/components/ChatMessages.tsx`)
5. Current result formatting is string-based. Tool results are converted into text lines inside `useIaraChat`; this is insufficient for reusable artifact cards, actions, status, provenance and contextual panels. (`src/modules/iara/hooks/useIaraChat.ts`)
6. The domain layer already returns `artifacts` and `panel`, but there is no matching UI contract in the audited IARA components. (`src/lib/agents/domain.ts`)
7. The current domain router uses keyword matching for domain selection. It is a deterministic fallback/adapter, not the final conversational intent UX. (`src/lib/agents/domain.ts`)
8. The old IARA service also contains keyword routing and direct studio/Estela command concepts, creating a second conceptual routing model. (`src/modules/iara/services/iaraService.ts`)
9. The current IARA copy/header uses `IARA.ai`, `Online`, `IARA Target Painter`, `Confirmar Alvo` and `materialização`, which conflicts with the Copy Master principle of natural, professional woodworking language and non-futuristic AI presentation. (`src/modules/iara/index.tsx`, `src/modules/iara/hooks/useIaraChat.ts`, `src/modules/iara/components/ChatInput.tsx`)
10. The existing Home/project journey is still a step-based journey (`Nome da obra`, `Foto do ambiente`, `O que o cliente quer`, etc.). It should be preserved as a capability, but the new IARA experience should make it conversational rather than force the user through a rigid sequence. (`src/modules/jornada/types.ts`, `src/modules/jornada/NovoProjeto.tsx`)
11. The main application navigation still exposes independent modules such as Estúdio, Orçamento and Lista de Corte. The new IARA experience should make these secondary work surfaces rather than the primary mental model. (`src/pages/Index.tsx`, `src/modules/config.ts`)

### Critical implementation constraint

This document does **not** authorize replacing the old orchestrator, changing Supabase/Auth/Gemini/provider, modifying the 20-agent registry, or implementing frontend. The Frontend Agent must treat the above as an integration gap to resolve within the existing architecture, not as permission to create a third architecture.

---

## 3. PRODUCT EXPERIENCE PRINCIPLES

### P1 — One conversation

The user always talks to IARA. There must not be four parallel chats for IARA, BENTO, ESTELA and JUCA.

### P2 — Project is durable context

Project identity, customer, environment, accepted decisions, measurements, artifacts and current state travel with the conversation.

### P3 — Natural language first

Buttons suggest actions; language remains the most powerful input.

### P4 — Ask only what blocks progress

IARA should ask the smallest useful question. One missing critical fact is better than a form with ten fields.

### P5 — Evidence before certainty

The UI must distinguish measured, calibrated, estimated and unknown values where the underlying agent contract provides that distinction. Uncertainty must not disappear in the conversational layer.

### P6 — Artifacts are work products

A render, budget, cut plan or checklist is not merely a message. It is a persistent, inspectable project artifact linked to the conversation and project.

### P7 — Progressive disclosure

Do not show context panels, specialist labels, technical evidence or operational detail unless it helps the current task.

### P8 — Suggestions are optional

Never turn IARA into a wizard. A user can ignore a suggested action and type another request.

### P9 — No technical leakage

Never expose provider names, stack traces, HTTP status, Supabase errors, agent IDs, internal tool names or orchestration mechanics to the user.

### P10 — Real woodworking language

Prefer `projeto`, `ambiente`, `medidas`, `materiais`, `ferragens`, `lista de corte`, `orçamento`, `produção`, `montagem`, `entrega`.

Avoid internal/futuristic labels such as `IARA.ai`, `Target Painter`, `materialização`, `Super Marcenapp`, `Next-Gen` or AI spectacle language.

---

## 4. INFORMATION ARCHITECTURE

### Primary layer

```text
MARCENAPP
  ↓
IARA
  ↓
Projeto atual
  ↓
Conversa
  ↓
Contexto/artefato quando relevante
```

### Secondary work surfaces

```text
Projeto
├── Visão geral
├── Ambiente
├── Dimensionamento
├── 2D / 3D
├── Materiais
├── Ferragens
├── Lista de corte
├── Orçamento
├── Pedido
├── Produção
├── Montagem
└── Entrega
```

These surfaces may remain accessible for detailed editing and verification. They must not become separate conceptual products.

### Specialist layer — internal

```text
IARA
├── Inteligência do Projeto
├── BENTO — Produção
├── ESTELA — Negócio
└── JUCA — Execução
```

No separate specialist chat navigation.

---

## 5. CANONICAL CONVERSATION MODEL

The conversation is a project workspace, not a generic chat transcript.

Each conversation session has:

- `projectId` — nullable only when the user is not yet working on a project;
- message history;
- current project context;
- pending user question, if any;
- active operation, if any;
- suggested actions;
- linked artifacts;
- current product state;
- unresolved blockers/questions;
- provenance/evidence when relevant.

### Message types

```text
user_text
user_image
user_file
assistant_text
assistant_question
assistant_action
assistant_progress
assistant_artifact
assistant_warning
assistant_error
system_context
```

These are UX concepts. The Frontend Agent must map them to existing data/contracts rather than create a second persistence system.

### Message anatomy

Every assistant message may contain:

1. concise text;
2. optional action buttons;
3. optional artifact preview;
4. optional status/progress;
5. optional evidence or warning;
6. timestamp.

The visual hierarchy is text first, action second, artifact third.

---

## 6. COMPOSER / SMART ACTION BUTTON

### Composer layout — desktop

```text
[ + Smart actions ] [ mensagem................................ ] [ enviar ]
```

Attachment and voice controls remain available without dominating the composer.

### Smart Action categories

#### IARA — Projeto

- Analisar ambiente
- Criar projeto
- Conferir medidas
- Gerar render
- Revisar projeto

#### BENTO — Produção

- Materiais
- Ferragens
- Lista de corte
- Estoque
- Produção

#### ESTELA — Negócio

- Orçamento
- Documentos
- Pedido

#### JUCA — Execução

- Montagem
- Instalação
- Checklist
- Entrega

### Behavior

Selecting an action must produce a structured user intent that is routed through the canonical IARA/domain architecture.

**Never:** `button → direct agent`.

**Correct:** `button → intent → IARA → domain specialist when required → technical agents → result/artifact → conversation + context panel`.

### Context-aware action visibility

The menu should prioritize relevant actions. Examples:

- no project + photo: `Analisar ambiente`, `Criar projeto`;
- project with render pending: `Gerar render`, `Revisar projeto`;
- approved project: `Orçamento`, `Produção`;
- production stage: `Materiais`, `Lista de corte`, `Estoque`.

Do not hide capabilities solely because they are not the “next step”; contextual ranking is preferred over hard gating.

---

## 7. HOME / ENTRY EXPERIENCE

The Home is not an administrative ERP dashboard.

Primary question:

> **O que você quer fazer?**

Primary inputs:

- Fotografar ambiente
- Escolher foto
- Conversar com IARA
- Continuar projeto

Below that, show project continuity in a compact way:

```text
Seus projetos

Cozinha João
Em desenvolvimento · Próximo passo: revisar medidas
[Continuar projeto]

Closet Maria
Pronto para orçamento
[Revisar orçamento]
```

The existing project list and progress concepts should be reused where possible. The current Home already loads project records and calculates a resumable stage; preserve that continuity, but avoid presenting the stage system as a rigid wizard. (`src/modules/jornada/Home.tsx`)

---

## 8. PROJECT CONTEXT

When a project is known, the conversation header/context should show a compact identity:

```text
Projeto
Cozinha João
Cliente · João Silva
Em desenvolvimento
```

The user should not repeatedly select the project for every action.

### Context rules

- If `projectId` exists, use it as the default context.
- If the user explicitly switches project, update context visibly.
- If the user refers to “aquele projeto”, resolve from active/recent context when unambiguous.
- If ambiguous between two projects, ask a short clarification.
- Never silently execute an operation against the wrong project.

### Returning to work

On reopening a project, show the last meaningful conversation context and the current project state. Do not reset to an empty generic chat.

---

## 9. CONTEXT PANEL

The panel is secondary to conversation and opens only when a result benefits from a larger visual/detail surface.

### Desktop

```text
┌───────────────────────────────┬──────────────────────┐
│                               │                      │
│          CONVERSA             │       CONTEXTO       │
│                               │                      │
│  IARA                         │  Render              │
│  Seu render está pronto.      │  [imagem]            │
│  [Abrir render]               │                      │
│                               │  Projeto              │
│                               │  Medidas              │
│                               │  Materiais            │
│                               │                      │
└───────────────────────────────┴──────────────────────┘
```

### Open triggers

Open when:

- user clicks `Abrir render`;
- an artifact requires inspection;
- a comparison/review needs visual detail;
- a technical list is too dense for the message;
- the user explicitly asks to see details.

Do not automatically navigate away from the conversation.

### Close behavior

- explicit close;
- mobile back gesture/button;
- selecting another artifact replaces the panel content;
- conversation remains intact.

### Panel must preserve context

Closing the panel must not lose the artifact or reset the conversation.

---

## 10. ARTIFACT SYSTEM

### Canonical artifact types

```text
project
render
budget
cut_plan
materials
hardware
contract
order
checklist
production
```

### Artifact card anatomy

```text
[Type]
Nome do artefato
Resumo curto
Status
[Ver] [Continuar]
```

Optional metadata:

- project;
- generated/updated time;
- status;
- version;
- warnings;
- confidence/evidence when relevant.

### Artifact lifecycle

```text
requested
  ↓
processing
  ↓
ready
  ├── revised
  ├── approved
  └── superseded
```

Errors should be represented as artifact status plus recovery action, not as a dead-end message.

### Provenance

Every artifact shown by IARA should be traceable to:

- project;
- originating conversation message/request;
- artifact type;
- relevant operation/correlation ID where available.

The existing domain contract already exposes `artifacts` and `panel`; the UI specification now gives that contract a consistent presentation model. (`src/lib/agents/domain.ts`)

---

## 11. PRIMARY JOURNEY — FOTO ATÉ ENTREGA

### Stage 1 — Photo/input

**User sees:** composer and photo/file input.

**IARA says:**
> “Envie uma foto do ambiente e me diga o que você quer fazer.”

If the user already sent enough context, do not repeat the request.

**Action:** `Analisar ambiente` may appear.

**Artifact:** environment analysis/project draft when supported.

**Next suggestion:** confirm only the information needed to proceed.

User may continue naturally by typing.

### Stage 2 — Analysis

**IARA says:**
> “Analisei o ambiente. Consigo seguir, mas preciso confirmar a largura aproximada desta parede.”

Questions are progressive and blocking only when necessary.

**Artifact:** analysis summary.

**Next suggestion:** `Criar projeto` or the smallest missing confirmation.

### Stage 3 — Project

**IARA says:**
> “Projeto criado. Vou manter as informações desta conversa vinculadas a ele.”

**Artifact:** Project.

**Next suggestion:** `Revisar projeto` / `Gerar render` depending on readiness.

### Stage 4 — Render

**IARA says:**
> “O render está pronto para você revisar.”

**Artifact:** Render.

**Action:** `Abrir render`.

Panel opens on demand.

### Stage 5 — Revision

User may say:

> “Troque o acabamento.”

No navigation required.

IARA confirms the requested change and updates the relevant artifact/context.

If the change can affect technical data, the UX must surface the consequence before downstream artifacts are treated as valid.

### Stage 6 — Approval

**IARA says:**
> “O projeto está pronto para aprovação.”

Actions:

- `Aprovar projeto`
- `Revisar projeto`

Approval must be an explicit decision, not inferred from viewing a render.

### Stage 7 — Budget

After approval or when explicitly requested:

**IARA says:**
> “Posso preparar o orçamento com os dados disponíveis deste projeto.”

If required data is missing:

> “Preciso dos custos de materiais e mão de obra para calcular o orçamento real.”

Never fabricate prices.

### Stage 8 — Order

If the commercial capability is available and data is sufficient:

> “O orçamento está pronto. Posso preparar o pedido.”

Artifact: Order.

### Stage 9 — Production

IARA may hand production work to BENTO internally.

User-facing copy remains simple:

> “Vou preparar as informações para produção.”

Artifacts may include materials, hardware, cut plan and production information.

### Stage 10 — Assembly

JUCA is an internal domain specialist. User-facing action:

`Montagem` / `Checklist` / `Instalação`.

Do not force a new chat.

### Stage 11 — Delivery

User-facing action:

`Entrega`.

The conversation and project remain the same context through completion.

---

## 12. PROACTIVE IARA

IARA may suggest the next useful action after a successful result.

Example:

```text
IARA
O render foi aprovado.

[Preparar orçamento]
[Continuar projeto]
```

Rules:

- maximum two or three primary actions;
- one should normally be the recommended next action;
- never block free text;
- recommendation must reflect actual project state;
- do not recommend an operation whose prerequisites are missing without explaining the missing prerequisite.

### Good proactive behavior

> “O projeto foi aprovado. Quer que eu prepare o orçamento?”

### Bad proactive behavior

> “Agora você precisa ir para Orçamento.”

The first is assistance. The second is a wizard.

---

## 13. QUESTION POLICY

IARA asks a question only when the answer is required to:

- execute the requested action safely;
- resolve ambiguity that could affect the result;
- validate a critical technical assumption;
- avoid a potentially costly or irreversible mistake.

### Question format

```text
Preciso confirmar uma coisa:
Qual é a largura aproximada da parede?

[2,40 m] [2,80 m] [Outra medida]
```

If free text is preferable, keep the input directly in the conversation.

### Never batch unnecessary questions

Do not ask style, color, material, dimensions, budget and finish simultaneously if the current operation only requires one of them.

---

## 14. SPECIALISTS — IARA, BENTO, ESTELA, JUCA

### Default visibility rule

**Invisible by default.**

The user should simply experience IARA coordinating the work.

### When to surface a specialist name

Only when it improves comprehension or trust, for example:

> “Vou pedir ao BENTO para conferir as informações de produção.”

or a subtle context label:

`Produção · BENTO`

Do not create specialist avatars or independent chat identities.

### Functional identities

**IARA:** project intelligence, interpretation, design, coordination.

**BENTO:** materials, hardware, cutting, stock, production.

**ESTELA:** budget, commercial documents, order.

**JUCA:** assembly, installation, checklist, delivery.

They are specialists, not mascots or characters.

### Current architecture alignment

The domain layer already models these four domains under IARA and maps the technical registry without duplicating the 20 agents. Preserve this architecture. (`src/lib/agents/domain.ts`, `src/lib/agents/domain.test.ts`)

---

## 15. IARA STATES

### Idle

```text
Como posso ajudar com este projeto?
```

### Thinking

```text
IARA está analisando…
```

### Executing

```text
IARA está preparando o projeto…
```

For long operations, show the actual operation when known:

```text
Preparando o render…
```

### Needs input

```text
Preciso confirmar uma medida antes de continuar.
```

### Ready

```text
Projeto pronto para revisão.
```

### Warning

```text
Encontrei uma diferença entre as medidas informadas e a análise das fotos.
```

Action: `Revisar medidas`.

### Error

```text
Não foi possível concluir esta etapa.
Verifique os dados e tente novamente.
```

Action: `Tentar novamente` or `Revisar projeto` depending on cause.

### Never expose

- `provider_timeout`
- `missing_api_key`
- `HTTP 500`
- `executeToolCall`
- `agentId`
- raw Supabase/Gemini errors
- stack traces

The existing AI service already normalizes many provider errors into user-readable messages. Preserve that principle. (`src/services/ai.ts`)

---

## 16. MOBILE / RESPONSIVE

### Mobile-first structure

```text
┌───────────────────────┐
│ Projeto / IARA        │
├───────────────────────┤
│                       │
│ Conversa              │
│                       │
│ messages              │
│                       │
├───────────────────────┤
│ Smart actions         │
│ [ + ] mensagem [→]   │
└───────────────────────┘
```

### Artifact behavior

Open artifacts in a bottom sheet/drawer.

The conversation remains underneath and its scroll position/state must be preserved.

### Touch targets

All interactive controls must be comfortably touchable; use the existing accessibility baseline as minimum, not as a visual afterthought.

### Voice

The current browser speech recognition foundation should remain available where supported. Unsupported browsers should simply omit/disable the voice affordance without breaking the composer. (`src/modules/iara/hooks/useIaraChat.ts`)

---

## 17. ACCESSIBILITY

Minimum requirements:

- semantic landmarks for conversation and composer;
- visible focus states;
- keyboard access to all actions;
- `aria-live` for progress/status/error changes;
- descriptive labels for attachment, microphone, send, close and artifact controls;
- sufficient contrast;
- no color-only state communication;
- touch targets suitable for mobile;
- focus moves into an opened context panel and returns to its trigger on close;
- screen readers can distinguish user vs IARA messages;
- errors provide recovery actions;
- dynamic progress is not announced excessively.

The current message component already has some accessibility primitives (`role="alert"`, `aria-live`/status patterns and labels); preserve and extend them. (`src/modules/iara/components/ChatMessages.tsx`)

---

## 18. PRODUCT EVENT MODEL — FUTURE ANALYTICS

Do not implement analytics in this stage. Define the event vocabulary for future instrumentation.

### Entry

- `conversation_started`
- `project_context_opened`
- `photo_uploaded`
- `file_uploaded`
- `voice_input_started`
- `voice_input_completed`

### Project

- `environment_analysis_requested`
- `environment_analysis_completed`
- `project_created`
- `project_opened`
- `project_resumed`
- `measurement_confirmation_requested`
- `measurement_confirmed`
- `project_review_requested`

### Visual

- `render_requested`
- `render_started`
- `render_ready`
- `render_opened`
- `render_revision_requested`
- `render_approved`

### Commercial

- `budget_requested`
- `budget_ready`
- `budget_reviewed`
- `order_requested`
- `order_created`

### Production/execution

- `materials_reviewed`
- `hardware_reviewed`
- `cut_plan_requested`
- `cut_plan_ready`
- `production_started`
- `assembly_started`
- `installation_started`
- `checklist_completed`
- `delivery_completed`

### Error/quality

- `iara_question_presented`
- `iara_warning_presented`
- `iara_operation_failed`
- `iara_operation_retried`
- `artifact_opened`
- `artifact_closed`

Every event should eventually carry project/context identifiers and a correlation ID where technically appropriate. Do not log sensitive content as event payload by default.

---

## 19. RISKS

### R0 — Two orchestration paths

The biggest current risk is that the new domain architecture and the active IARA chat path are separate. `useIaraChat` currently imports `runOrchestrator` from `src/core/orchestrator.ts`, while the new domain experience is in `src/lib/agents/domain.ts`. This can create divergent routing, artifacts and specialist behavior.

**Recommendation:** Frontend integration must consume one canonical application-level IARA/domain contract. Do not create another orchestrator.

### R1 — Duplicate chat state

Do not create a second Zustand/React/Supabase message store. The existing `chat_messages` persistence and project filtering should remain the source of conversation history.

### R2 — String-only results

Current `useIaraChat` converts tool results into strings. This makes it difficult to render structured artifacts and actions consistently.

**Recommendation:** introduce an adapter/presentation model at the UI boundary without replacing the existing persistence or tool contracts.

### R3 — Studio swallowing IARA

`StudioHub` currently embeds IARA inside the Studio. This reverses the intended hierarchy.

**Recommendation:** IARA should be the primary shell; Studio becomes a contextual work surface opened when the task requires it.

### R4 — Keyword routing duplication

`iaraService.ts`, `src/core/orchestrator.ts` and `src/lib/agents/domain.ts` represent overlapping intent/routing concepts.

**Recommendation:** do not add another routing table. Establish the canonical contract at integration time and preserve old compatibility until the active path is safely migrated.

### R5 — Futuristic AI language

Current UI labels such as `IARA.ai`, `Target Painter` and `materialização` undermine the natural woodworking identity.

**Recommendation:** use Copy Master language and functional labels.

### R6 — False certainty

Image analysis currently contains a prompt that asks for numerical dimensions from an image. The domain documentation explicitly requires calibrated/reference-based prediction and uncertainty. The conversational UX must never present an inferred measure as a measured fact.

### R7 — Irreversible downstream consequences

Changing a dimension/material/hardware choice can affect render, cut plan, budget and production. The experience must surface affected downstream artifacts when the system knows they are stale or invalid.

---

## 20. THINGS THAT MUST NOT BE IMPLEMENTED IN THIS STAGE

- No new frontend implementation as part of this specification.
- No Supabase schema changes.
- No Auth changes.
- No Gemini/provider changes.
- No changes to `ai-orchestrator`.
- No replacement of the 20-agent registry.
- No second orchestrator.
- No second message store.
- No second project context store.
- No independent BENTO/ESTELA/JUCA chats.
- No mandatory multi-step wizard replacing free conversation.
- No hardcoded fake project/material/budget/production numbers.
- No automatic approval inferred from render viewing.
- No declaration of optimized cutting unless the real optimization/audit contracts support it.
- No new futuristic AI visual identity.
- No analytics implementation in this stage.
- No landing-page or global-brand changes.

---

## 21. FRONTEND HANDOFF

The Frontend Agent should implement the experience in this order, while reusing existing components/contracts where possible:

### Handoff 1 — Establish the shell

Create/reshape the UI so IARA is the primary conversation surface and the active project is visible as context.

### Handoff 2 — Composer

Extend the existing `ChatInput` with Smart Actions without removing attachment/voice support.

### Handoff 3 — Message presentation model

Map existing message data and domain/tool results into typed presentation states: text, question, progress, action, artifact, warning, error.

Do not create a second persistence format unless an adapter is strictly necessary.

### Handoff 4 — Artifact cards

Implement one reusable artifact card pattern and open artifacts in the Context Panel.

### Handoff 5 — Context Panel

Desktop: right-side contextual panel.
Mobile: bottom sheet/drawer.

Conversation remains persistent.

### Handoff 6 — Domain specialist transparency

Keep specialists hidden by default. Surface only as lightweight context when it helps.

### Handoff 7 — Project continuity

Ensure `projectId` follows conversation actions. Eliminate repeated project selection where active context is unambiguous.

### Handoff 8 — Proactive next steps

Add contextual action suggestions after successful operations.

### Handoff 9 — State/error language

Normalize IARA states using Copy Master language and existing normalized AI errors.

### Handoff 10 — Mobile/accessibility

Implement responsive panel behavior, keyboard/focus management and screen-reader announcements.

### Handoff 11 — Integration validation

Before considering the UI complete, verify that the active conversation path uses the canonical IARA/domain contract and that no parallel orchestration/store was introduced.

---

## 22. ACCEPTANCE CRITERIA

### A — Conversation

- [ ] User can start with text.
- [ ] User can start with a photo.
- [ ] User can attach supported files where capability exists.
- [ ] Voice input remains available where supported.
- [ ] Conversation persists for the active project.
- [ ] Returning to a project restores the relevant conversation context.

### B — IARA

- [ ] User experiences one IARA.
- [ ] BENTO/ESTELA/JUCA do not become separate chats.
- [ ] Specialist names are hidden by default.
- [ ] IARA can suggest next actions without forcing them.
- [ ] User can always type a different request.

### C — Smart Actions

- [ ] Smart Action menu exists beside composer.
- [ ] Actions are grouped by functional domain.
- [ ] Selecting an action routes through IARA/domain architecture.
- [ ] Action visibility can be contextual.

### D — Context

- [ ] Active project is visible.
- [ ] User does not repeatedly select the same project.
- [ ] Ambiguous project references trigger clarification rather than silent selection.

### E — Artifacts

- [ ] Render, budget, cut plan, materials, hardware, documents, order and checklist can use a consistent artifact presentation when the underlying capability exists.
- [ ] Artifact is linked to project and originating request.
- [ ] Artifact can open in Context Panel.
- [ ] Closing the panel does not lose conversation state.

### F — States

- [ ] Thinking state is understandable.
- [ ] Executing state identifies the operation in plain language.
- [ ] Needs-input state asks one useful question.
- [ ] Error state explains the problem without technical internals and offers recovery.
- [ ] Warnings can block or request review when required by evidence/quality rules.

### G — Journey

- [ ] Photo → analysis → project can happen without unnecessary navigation.
- [ ] Project → render can happen without leaving the conversation unnecessarily.
- [ ] Render → revision can happen by natural language.
- [ ] Approval is explicit.
- [ ] Budget consumes real project context.
- [ ] Production work consumes project context.
- [ ] Assembly/delivery remain in the same journey.

### H — Safety/quality of product information

- [ ] No fabricated measurements are presented as facts.
- [ ] No fabricated budgets/prices are presented as real.
- [ ] No unsupported production readiness is shown.
- [ ] Technical blockers remain visible to the appropriate user action.

### I — Accessibility

- [ ] Keyboard navigation works.
- [ ] Focus is visible.
- [ ] Context panel has correct focus entry/return.
- [ ] Dynamic status uses appropriate live announcements.
- [ ] Controls have accessible names.
- [ ] Mobile controls have adequate touch targets.

---

## 23. RECOMMENDED IMPLEMENTATION ORDER

```text
1. Canonical IARA/domain integration boundary
        ↓
2. IARA primary shell + project context
        ↓
3. Composer + Smart Actions
        ↓
4. Structured message presentation
        ↓
5. Artifact cards
        ↓
6. Context Panel
        ↓
7. Proactive next actions
        ↓
8. Specialist visibility rules
        ↓
9. Mobile sheet/drawer
        ↓
10. Accessibility/focus polish
        ↓
11. End-to-end acceptance validation
```

Do not reverse this order by starting with visual polish. The most important risk is architecture/experience continuity, not styling.

---

## 24. PRODUCT NORTH STAR

A successful experience should allow a marceneiro to do this naturally:

```text
ENTRA
  ↓
MANDA UMA FOTO
  ↓
FALA COM IARA
  ↓
IARA ENTENDE
  ↓
CONFIRMA SÓ O QUE FALTA
  ↓
CRIA/ATUALIZA O PROJETO
  ↓
MOSTRA O RESULTADO
  ↓
RECEBE FEEDBACK
  ↓
ATUALIZA O PROJETO
  ↓
PREPARA ORÇAMENTO
  ↓
PREPARA PRODUÇÃO
  ↓
ACOMPANHA MONTAGEM
  ↓
ENTREGA
```

At no point should the user need to understand which technical agent ran.

At no point should the product feel like a collection of unrelated modules.

The experience should feel like:

> **“Estou trabalhando em um projeto e a IARA está me ajudando a levar esse projeto adiante.”**

That is the intended product expression of:

> **Marcenapp — Do projeto à produção, tudo no lugar.**

---

## 25. FILES ANALYZED

The following real repository files were inspected for this specification:

- `src/App.tsx`
- `src/pages/Index.tsx`
- `src/modules/config.ts`
- `src/modules/jornada/Home.tsx`
- `src/modules/jornada/NovoProjeto.tsx`
- `src/modules/jornada/types.ts`
- `src/modules/iara/index.tsx`
- `src/modules/iara/hooks/useIaraChat.ts`
- `src/modules/iara/components/ChatInput.tsx`
- `src/modules/iara/components/ChatMessages.tsx`
- `src/modules/iara/services/iaraService.ts`
- `src/modules/ambientes/StudioHub.tsx`
- `src/modules/ambientes/StudioView.tsx`
- `src/core/orchestrator.ts`
- `src/core/toolRegistry.ts`
- `src/store/useMarcenappOS.ts`
- `src/services/ai.ts`
- `src/lib/agents/domain.ts`
- `src/lib/agents/orchestrator.ts`
- `src/lib/agents/registry.ts`
- `src/lib/agents/domain.test.ts`
- `docs/agentes-marcenapp.md`

No frontend code, backend code, Auth, Supabase, provider, Gemini, `ai-orchestrator` or agent registry was modified as part of this product/experience specification.