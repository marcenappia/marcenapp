# Checklist de Refatoração e Otimização — Marcenapp OS

Executar em ordem de prioridade. Cada item tem critério de validação em staging.

## 🔴 ALTA — Fundação (executar primeiro)

### 1. Núcleo central de estado (Core Store)
Consolidar em `src/core/` a autenticação, permissões e Command Bus. Hoje `useAuth`, `useMarcenappOS` e stores por módulo vivem soltos.

- Criar `src/core/useCore.ts` unificando: `session`, `user`, `profile`, `role`, `activeModule`, `commandBus`.
- Migrar `useMarcenappOS` para dentro do core como slice `bus`.
- Migrar `useAuth` para slice `auth` (mantendo API pública).
- IARA, Estúdio, Portal, Estela passam a ler via seletores memoizados (`useCore(s => s.bus.pending)`) — sem stores paralelos.
- Validação: um único `subscribe` no devtools mostra todo o estado; nenhum módulo importa outro store diretamente.

### 2. RLS + permissões por módulo
As policies atuais são "own row" via `auth.uid()`. Falta camada de papéis (owner/editor/viewer) para colaboração futura e defesa em profundidade.

- Migração: criar `app_role` enum + tabela `user_roles` + função `has_role()` (security definer).
- Adicionar checagem `requirePermission(action, resource)` no core antes de qualquer `supabase.from(...).insert/update/delete`.
- Edge Functions `ai-image`/`ai-text`: validar JWT em código + rate limit por `user_id` (bucket em memória ou tabela `rate_limits`).
- Zod schema em `ai-text` (hoje só `ai-image` valida).
- Validação: teste E2E tenta acessar recurso de outro usuário → 403; usuário sem role tenta ação restrita → 403.

### 3. Testes automatizados dos fluxos centrais
Cobertura mínima para travar regressão nas próximas refatorações.

- Unit (Vitest):
  - `commandBus.dispatch` idempotência + persistência
  - `iaraService.interpretCommand` (matriz de prompts → intents)
  - `orcamentoService.calcular` (fórmulas de custo)
  - `packParts` (plano de corte)
- Integração (Vitest + msw): IARA emite comando → Estúdio consome → resultado persiste com mesmo `id`.
- E2E (Playwright): fluxo completo IARA → Estúdio → Portal → Estela com usuário logado; assert que preview no chat = resultado do Estúdio.
- Validação: `bunx vitest run` verde, `playwright test` verde no CI.

## 🟡 MÉDIA — Consistência

### 4. Segregação de responsabilidades
Hoje há vazamento (Estúdio "pensa", IARA às vezes renderiza).

- IARA: só interpreta + emite comando. Nunca chama `callAIImage`.
- Estúdio: só executa render. Nunca decide o que renderizar.
- Portal: só apresenta/persiste. Nunca chama IA.
- Estela: só calcula/orça. Nunca decide layout.
- Contrato de comunicação: apenas `dispatchCommand` do core.
- Validação: `rg "callAIImage" src/modules/iara/` = 0 matches; `rg "interpretCommand" src/modules/ambientes/` = 0 matches.

### 5. Migrar `interpretCommand` para LLM real
Hoje é keyword-matching frágil. Usar `ai-text` com schema JSON estruturado.

- Prompt sistema retorna `{intent, target, params}` validado por Zod.
- Fallback para keyword quando LLM falhar.
- Validação: matriz de 20 prompts ambíguos → intent correto em ≥90%.

### 6. Persistência do Command Bus no backend
Hoje só localStorage — perde histórico entre dispositivos.

- Tabela `command_history` (id, user_id, source, target, action, payload, status, result, created_at).
- Sync bidirecional core ↔ backend com debounce.
- Validação: logar no device A, dispatch comando, abrir device B → mesmo histórico visível.

## 🟢 BAIXA — Polimento

### 7. Performance
- `React.lazy` nos módulos pesados (Studio/Three.js, Elevator).
- Auditar seletores Zustand com `shallow` — evitar re-renders (já teve React #185).
- Comprimir imagens da galeria antes de persistir (hoje base64 em texto).

### 8. SEO per-route
- Adicionar `react-helmet-async` para title/description/canonical por módulo.
- Atualizar `sitemap.xml` conforme rotas reais forem adicionadas.

### 9. Observabilidade
- Log estruturado nas Edge Functions (`console.log(JSON.stringify({level, event, user_id}))`).
- Página `/admin/health` mostrando fila do Command Bus e últimos erros (gated por role `admin`).

---

## Ordem sugerida de execução

```text
Sprint 1 (Fundação):     1 → 2 → 3
Sprint 2 (Consistência): 4 → 5 → 6
Sprint 3 (Polimento):    7 → 8 → 9
```

## Detalhes técnicos

- **Migração `user_roles`**: enum `app_role AS ENUM ('owner','editor','viewer','admin')`, tabela com `(user_id, role)` unique, função `has_role(_user_id uuid, _role app_role)` SECURITY DEFINER, GRANT `SELECT` a `authenticated`, GRANT `ALL` a `service_role`.
- **Core store**: usar Zustand `combine` + `persist` com `partialize` (não persistir `commandBus.processing`, só `history`) e `migrate` versionado (já implementado, manter).
- **Rate limit Edge Functions**: tabela `rate_limits (user_id, endpoint, window_start, count)`, checar antes de chamar Gemini, 429 se exceder (ex: 30 req/min por usuário).
- **Testes E2E**: reusar `LOVABLE_BROWSER_SUPABASE_*` do sandbox para sessão autenticada.

Não vou executar nenhuma etapa até você aprovar. Cada sprint pode ser iniciado independentemente — me diga qual atacar primeiro.
