# Auditoria rápida — MARCENAPP OS (estado atual, pós-Fase 0)

Somente diagnóstico. Sem alterações.

## 1) Implementado vs mock/placeholder

| Funcionalidade | Estado | Evidência |
|---|---|---|
| Auth (email/senha, recuperação, reenvio com cooldown) | Implementada | `src/pages/Auth.tsx`, `useAuth` |
| Onboarding (tour, spotlight, persistência em perfil + localStorage) | Implementado | `Onboarding.tsx`, colunas em `profiles` |
| Edge Functions de IA protegidas (JWT + rate limit + CORS restrito) | Implementada (Fase 0) | `supabase/functions/_shared/guard.ts`, `ai-text`, `ai-image`, `ai-orchestrator` |
| Cliente enviando JWT da sessão | Implementada | `src/services/ai.ts` (`aiHeaders`), `src/core/orchestrator.ts` |
| IARA orquestradora via Gemini Function Calling | Implementada, com fallback por palavras-chave | `ai-orchestrator/index.ts`, `src/core/orchestrator.ts`, `toolRegistry.ts` |
| Studio 3D (Three.js paramétrico) | Implementado | `ThreeScene.tsx`, `useStudioStore`, `StudioWorker` |
| Geração de imagem Gemini | Implementada | `ai-image` (gemini-2.5-flash-image) |
| Chat IARA com histórico por projeto, retry, sugestões | Implementado | `useIaraChat.ts`, `chat_messages.project_id` |
| Persistência projetos/galeria/cláusulas | Implementada | tabelas `projects`, `gallery_images`, `custom_clauses` |
| Clientes (CRUD) | Parcial | tabela `clientes` existe; UI do módulo é básica |
| Diário de Obra | Mock/placeholder | componente base sem persistência real |
| Orçamento | Parcial (demonstrativo) | `useOrcamento`, fórmulas com fatores fixos, sem fita de borda/perdas |
| Plano de corte | Parcial | `packParts` simplificado; sem veio, sobras, exportação |
| Contratos | Parcial | gera cláusulas via IA; sem PDF/persistência do contrato completo |
| Ferragens / Logística | Ausente | sem módulos dedicados |
| RBAC (`user_roles`) | Implementado no banco, não usado na UI | `has_role` existe; todo usuário vira `owner` |

## 2) Principais problemas/bloqueios para produção

1. Três caminhos de renderização coexistem (IARA/Worker, Studio direto, Elevator direto) — risco de divergência e comandos duplicados.
2. Orçamento não é profissional: profundidade pouco usada, preços hardcoded, três fórmulas divergentes (`useOrcamento` vs `toolRegistry` vs `iaraService`).
3. Análise de medidas por imagem sem referência de escala; fallback fixo 2,0×2,5×0,6 pode alimentar orçamento errado sem aviso.
4. Imagens base64 persistidas em Postgres/localStorage (`gallery_images.image_url`, resultados do Worker) — cresce rápido; falta bucket de Storage.
5. Idempotência do `gerarRender` não é efetiva em todos os caminhos.
6. TypeScript com strictness reduzida (`noImplicitAny`/`strictNullChecks` off) e ~32 `any`.
7. `orchestrator_runs` guarda prompts/resultados (possível PII) sem política de retenção.
8. E2E Playwright existe, mas execução completa não foi comprovada; teste de integração IARA↔Studio foi corrigido na Fase 0.

## 3) IA / Gemini / IARA

- Pós-Fase 0, o fluxo é: chat → `runOrchestrator` (`src/core/orchestrator.ts`) → Edge `ai-orchestrator` (Function Calling, 5 tools: cliente, projeto, render, orçamento, contrato) → execução sequencial via `toolRegistry.ts` → render despachado ao Estúdio (Command Bus + `StudioWorker`).
- Autenticação real: `guardRequest` valida JWT via `auth.getUser` e aplica `consume_ai_rate_limit` (ai-text 30/min; limites por função). Rate limit verificado no banco (allow, allow, block 429).
- CORS restrito a origens Lovable/localhost; erros do Gemini não vazam corpo bruto (502/429 genéricos).
- Persistem débitos: fallback por palavras-chave ainda existe quando o orquestrador falha; sem backoff para 429 do provedor; `ai-text` sem `promptStats` (só `ai-image`).

## 4) Orçamento / medidas / produção

- Orçamento: funciona para demonstração (MDF, ferragens, MO, margem), mas não é profissional — sem fita de borda, sem perdas de corte reais, preços fixos em código.
- Medidas por IA: estimativa sem escala de referência, sem validação de plausibilidade e sem aviso ao usuário — risco comercial.
- Produção: plano de corte simplificado (sem veio/sobras/exportação), sem lista de ferragens consolidada, sem logística, contrato sem PDF/assinatura.

## 5) Segurança / Supabase

- RLS habilitado em todas as tabelas com policies por `auth.uid() = user_id` — confirmado.
- Sem chave Gemini nem service role no frontend — confirmado; chave só nas Edge Functions.
- Fase 0 corrigiu o P0 anterior: funções antes aceitavam a anon key pública; agora rejeitam (401) sem JWT de usuário.
- Pendências: RBAC não aplicado na aplicação; retenção de PII em `orchestrator_runs`/`chat_messages`; policies usam role `{public}` (funcionam, mas o ideal é `{authenticated}`).

## 6) Nota geral: 5,5 / 10

Subiu de 4,5 após a Fase 0 (auth real + rate limit + CORS + testes estáveis). Continua **não pronto para produção comercial**: os bloqueadores restantes são a qualidade do orçamento/medidas (risco de prejuízo real ao usuário), módulos operacionais incompletos (Clientes, Diário, Contrato PDF, ferragens) e armazenamento de imagens em base64. O núcleo técnico (auth, IA protegida, arquitetura IARA/Estúdio) está sólido.

## Próximo passo recomendado

Fase 1 do plano arquivado: unificar caminho de renderização, profissionalizar orçamento (fórmula única + fita de borda + perdas) e mover imagens para Storage.
