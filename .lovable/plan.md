# AUDITORIA TÉCNICA COMPLETA — MARCENAPP OS

Data: 05/09/2026. Escopo: repositório completo + banco (somente leitura). Nenhum arquivo alterado.
Legenda: **[não comprovado]** = não verificável pelo código/banco; não presumir que funciona.

## RESUMO EXECUTIVO

O Marcenapp tem uma casca de produto acima da média (SEO, acessibilidade do menu, onboarding, arquitetura modular, Command Bus, orquestrador com function calling do Gemini) sobre um núcleo de negócio ainda demonstrativo. Orçamento, plano de corte, clientes, diário de obra e contratos não estão em nível comercial: fórmulas triplicadas e sem profundidade, corte sem veio/kerf real/exportação, Clientes e Diário estáticos, contrato sem PDF nem persistência.

Na IA, o fluxo IARA → orquestrador → tools → Estúdio existe e está encadeado, mas: as 3 Edge Functions aceitam qualquer chamada com a chave pública, sem exigir login nem rate limit (qualquer pessoa consome a cota Gemini); há três caminhos paralelos de render; medidas estimadas por IA caem em valores fixos silenciosos que alimentam o orçamento. A suíte de testes não roda de forma confiável (estouro de memória).

## NOTA GERAL: 4,5 / 10

Infraestrutura, UX e arquitetura pontuariam 7; a falha de segurança/custo nas funções de IA e o núcleo de negócio demonstrativo puxam para baixo. Não é protótipo descartável, mas não é um sistema vendável ainda.

## PONTOS FORTES

- RLS ativo nas 8 tabelas, todas as policies `auth.uid() = user_id`; nenhum segredo (service_role/Gemini) no cliente.
- `ai-image` com validação Zod rigorosa e testes Deno próprios.
- Orquestrador real via Gemini Function Calling, 5 tools tipadas, log em `orchestrator_runs`.
- Fila do Estúdio com status, cancelamento, migração de versão e integração com o chat.
- Acessibilidade do menu, onboarding com spotlight/reduced motion, SEO completo, `ThreeScene` com cleanup correto, zero `console.log`.
- Chat por projeto, retry e debounce (entregues hoje).

## TOP 10 PROBLEMAS

| # | Sev | Problema | Evidência |
|---|---|---|---|
| 1 | P0 | Funções `ai-image`/`ai-text`/`ai-orchestrator` não validam usuário; cliente envia anon key como Bearer; sem rate limit | `src/services/ai.ts:12-14`, `src/core/orchestrator.ts:34-39`; nenhuma função chama `auth.getUser`; `config.toml` sem `[functions.*]` |
| 2 | P0 | Orçamento ignora profundidade; fatores mágicos 2.5/1.2/1.15/+200/+10%; sem tabela de preços editável | `useOrcamento.ts:16-29` |
| 3 | P0 | Três cálculos de orçamento divergentes mantidos por cópia manual | `useOrcamento.ts`, `toolRegistry.ts:158-174`, `iaraService.ts:71-78` |
| 4 | P0 | Clientes e Diário de Obra são telas estáticas sem estado/banco/handlers | `Clientes.tsx:15,20-24,35`, `Diario.tsx:15,21-29` |
| 5 | P0 | Plano de corte sem veio, kerf incompleto, sem sobras, sem exportação; import ignora fundo/prateleiras/gavetas | `patio/index.tsx:30-55,68-78,178-196` |
| 6 | P1 | `gerarContrato` só grava cláusulas avulsas; chat diz "Contrato preparado" | `toolRegistry.ts:189-228` |
| 7 | P1 | Medidas por IA sem validação; fallback fixo 2.0×2.5×0.6 alimenta orçamento silenciosamente | `iaraService.ts:83-93`, `useStudio.ts:138-146`, `Elevator.tsx:76-77` |
| 8 | P1 | Vitest estoura memória (OOM); zero testes de orçamento/corte/toolRegistry | execução `bunx vitest run` |
| 9 | P1 | Imagens base64 no Postgres e localStorage; sem Storage | 15 linhas com média ~94 KB em `chat_messages.image_url`; `useStudioStore.ts:145-151` |
| 10 | P1 | Três caminhos de render; idempotência da fila nunca ativada por `gerarRender` | `useStudio.ts:96-124`, `Elevator.tsx:53-69`, `useStudioStore.ts:54-64` vs `toolRegistry.ts:119-127` |

## POR SEVERIDADE

**P0**: funções de IA sem auth/rate limit; orçamento sem profundidade, fatores mágicos, preços hardcoded em 2 lugares, 3 implementações; Clientes sem CRUD; Diário mock; corte sem veio/sobras/export e kerf não considerado no encaixe.

**P1**: `gerarContrato` mock; contrato sem PDF (`window.print`) e sem persistência; análise de imagem sem validação; Vitest OOM e E2E **[não comprovado]**; base64 em banco/localStorage; render por 3 caminhos; fallback keyword só render/orçamento (`orchestrator.ts:107-125`) e `iaraService.interpretCommand/calculateSmartBudget` código morto; CORS `*`; `ai-orchestrator` devolve erro bruto do Gemini (`index.ts:164-173`); `ai-text` sem Zod; TS com strict desligado e 32 `: any`; fita de borda e perdas ausentes; RBAC (`user_roles`/`has_role`) não usado em nenhuma policy/tela.

**P2**: policies com role `{public}` (seguro hoje, frágil); `orchestrator_runs` com PII sem expurgo; Onboarding aponta para `nav-chat`/rota `chat` inexistente (`Onboarding.tsx:43-44`); 3 padrões de estilo (tokens / Tailwind cru / hex inline em `orcamentos/index.tsx:74-93`); `alert()` no Contrato (`Contrato.tsx:53`); bottom nav mobile corta em 5 itens; `ThreeScene` recria cena a cada mudança de `factors` **[impacto não medido]**; modelo Gemini em 3 arquivos; sem backoff em 429.

**P3**: código morto `App.css` e provável `NavLink.tsx`; `package.json` com nome do template; fallback genérico de `VITE_SUPPORT_WHATSAPP_LINK`; reset de senha com rate limit só no cliente (Redirect URLs **[não comprovado]**).

## TABELA DE FUNCIONALIDADES

| Funcionalidade | Status | Evidência |
|---|---|---|
| Login/cadastro/reset | Implementada | `Auth.tsx`, `useAuth.tsx`, trigger `handle_new_user` |
| Perfil + onboarding sincronizado | Implementada | `profiles.onboarding_*`, `Onboarding.tsx` |
| Chat IARA (por projeto, retry, sugestões) | Implementada | `useIaraChat.ts` |
| Orquestrador function calling | Implementada | `ai-orchestrator/index.ts` |
| Tools createCliente/createProjeto | Implementada | `toolRegistry.ts:33-99` |
| Tool gerarRender → Estúdio | Parcial (sem idempotência efetiva) | `toolRegistry.ts:101-138` |
| Tool calcularOrcamento | Parcial (duplicada, demonstrativa) | `toolRegistry.ts:140-187` |
| Tool gerarContrato | Mock/incompleta | `toolRegistry.ts:189-228` |
| Geração de imagem | Implementada | `ai-image/index.ts` |
| Análise de imagem → medidas | Parcial (fallback fixo) | `iaraService.ts:83-93` |
| Galeria | Parcial (base64 no banco) | `gallery_images` |
| Estúdio 3D | Implementada | `ThreeScene.tsx` |
| Elevador de planta | Parcial (render direto) | `Elevator.tsx` |
| Orçamento | Parcial/demonstrativa | `useOrcamento.ts` |
| Tabela de preços editável | Ausente | — |
| Plano de corte | Parcial (shelf simples) | `patio/index.tsx:32-55` |
| Export corte (PDF/DXF/CNC) | Ausente | — |
| Ferragens / Logística | Ausente | — |
| Clientes CRUD | Mock | `Clientes.tsx` |
| Diário de Obra | Mock | `Diario.tsx` |
| Contrato — cláusulas IA | Implementada **[não comprovado em runtime]** | `Contrato.tsx:32-53` |
| Contrato — PDF/persistência | Ausente/parcial | `Contrato.tsx:12,182,198` |
| RBAC | Ausente na prática | só `types.ts` |
| Rate limit IA | Ausente | — |
| Testes unitários | Parcial (OOM) | `src/test/*` |
| Testes E2E | Parcial **[não comprovado]** | `tests/e2e/` |

## AUDITORIA IARA / IA

Fluxo real: `useIaraChat.sendPrompt` → `runOrchestrator` → `ai-orchestrator` (gemini-2.0-flash) → `executeToolCall` (Zod) → inserts diretos / `gerarRender` na fila → `StudioWorker` → `studioService.generateVisual` → `ai-image` (gemini-2.5-flash-image) → `completeCommand` + `gallery_images` → chat observa `commandHistory`. Encadeamento estático comprovado; execução ponta a ponta com Gemini real **[não comprovado nesta auditoria]**.

Problemas: fallback keyword residual e pobre; código morto em `iaraService`; `gerarContrato` mock; `calcularOrcamento` cópia manual; 3 caminhos de render; idempotência inativa (retry duplica gasto); `ai-text` sem validação; sem backoff 429; análise de imagem sem escala de referência, sem faixa de plausibilidade e com fallback silencioso.

## AUDITORIA SEGURANÇA / BACKEND

- RLS correto em todas as tabelas; `user_roles` restrita; `has_role` com EXECUTE revogado de anon; sem SQL injection; só anon key no cliente.
- P0: funções de IA aceitam a anon key como JWT válido, sem checagem de usuário, sem rate limit, CORS `*`.
- `toolRegistry` insere `user_id` vindo do cliente; protegido apenas pelo `WITH CHECK` da RLS.
- `chat_messages.metadata` só passou a existir hoje — inserts de renders concluídos falhavam antes.
- `orchestrator_runs` acumula PII sem retenção. `verify_jwt` efetivo em produção **[não comprovado]**.

## AUDITORIA ORÇAMENTO / PRODUÇÃO

Orçamento demonstrativo: área frontal × fatores sem justificativa; profundidade ignorada; mão de obra como % do material; +10% oculto; +200 fixo; ferragens genéricas; sem fita de borda; chapas do orçamento não batem com o plano de corte.
Produção: corte shelf next-fit sem rotação/veio/sobras/export; import gera só lateral/base/porta; ferragens e logística inexistentes; contrato imprime via navegador e não persiste; Clientes e Diário são vitrines.

## PLANO DE AÇÃO EM FASES

**Fase 0 — Bloqueadores (1 semana)**
1. Nas 3 funções: validar JWT do usuário (`auth.getUser`), recusar anon; cliente passa a enviar o token da sessão.
2. Rate limit por usuário (tabela de contagem acessível só por service_role) antes de chamar o Gemini.
3. CORS restrito ao domínio publicado; Zod + cap de body em `ai-text`; não repassar corpo bruto do Gemini.
4. Corrigir suíte Vitest (OOM: pool/threads, isolar testes de Three.js) até rodar verde em CI.

**Fase 1 — Núcleo de negócio (2–3 semanas)**
5. Motor de orçamento único (`src/core/pricing`) usado por hook e tool; remover `calculateSmartBudget`.
6. Tabela `price_lists` persistida e editável (chapas, ferragens, fita de borda, mão de obra por hora/m²).
7. Gerador de lista de peças real (laterais, base/topo, fundo, prateleiras, gavetas) com profundidade e espessura; orçamento consome as chapas do plano de corte.
8. Plano de corte: kerf no encaixe, rotação por veio, registro de sobras, export PDF.
9. CRUD de Clientes ligado à tabela `clientes`; contrato persistido em `contracts` + PDF.

**Fase 2 — IA confiável (1–2 semanas)**
10. Todo render passa pela fila com `idempotencyKey` determinística (Studio e Elevator inclusos).
11. Medidas por IA: faixa de plausibilidade, rótulo "estimado — confira", sem fallback silencioso.
12. Remover fallback keyword e código morto; centralizar nome dos modelos; backoff em 429.
13. Bucket de Storage para imagens; parar de gravar base64 em `chat_messages`/`gallery_images`/localStorage.

**Fase 3 — Qualidade contínua**
14. `strictNullChecks`/`noImplicitAny` ligados; eliminar `any`.
15. Testes de orçamento, corte, toolRegistry e das 3 funções.
16. Padronizar estilo em tokens; trocar `alert()` por toast; corrigir step `chat` do onboarding; revisar bottom nav.
17. Diário de Obra real; decidir RBAC (implementar ou remover).

## ARQUIVOS QUE PRECISAM DE ATENÇÃO

`supabase/functions/ai-text|ai-orchestrator|ai-image/index.ts` · `src/services/ai.ts` · `src/core/orchestrator.ts` · `src/core/toolRegistry.ts` · `src/modules/orcamentos/hooks/useOrcamento.ts` · `src/modules/iara/services/iaraService.ts` · `src/modules/patio/index.tsx` · `src/modules/projetos/components/Clientes.tsx|Diario.tsx|Contrato.tsx` · `src/modules/ambientes/hooks/useStudio.ts`, `components/Elevator.tsx`, `StudioWorker.tsx` · `src/store/useStudioStore.ts` · `src/components/marcenaria/Onboarding.tsx` · `tsconfig.json`, `vitest.config.ts`.

## INCONSISTÊNCIAS E DUPLICAÇÕES

3 fórmulas de orçamento e 2 dicionários de preços · 2 fallbacks por keyword · 3 caminhos de render · 2 stores com histórico de comandos sobrepostos · 3 padrões de estilo · modelo Gemini em 3 arquivos · código morto (`App.css`, `NavLink.tsx`, `interpretCommand/calculateSmartBudget`) · onboarding referencia módulo `chat` removido.

## CONCLUSÃO: NÃO PRONTO PARA PRODUÇÃO

(1) Qualquer pessoa pode gastar a chave Gemini sem login — risco financeiro imediato ao publicar. (2) O orçamento, função central de venda, é demonstrativo e pode entregar preços errados. (3) Clientes, Diário, ferragens, logística, PDF de contrato e exportação de corte não existem funcionalmente. (4) Os testes não executam de forma confiável. Com a Fase 0 concluída o app serve para beta fechado de demonstração; uso comercial exige a Fase 1.

Aprovar este plano significa iniciar a Fase 0 (bloqueadores). Nada será alterado até a aprovação.
