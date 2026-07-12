# Roadmap IARA OS — Marcenapp

Transformar a IARA de chat em **orquestrador do sistema operacional** da marcenaria.
Cada versão é incremental e reutiliza as camadas anteriores.

---

## ✅ IARA OS v1 — Function Calling (em execução)

Substituir `interpretCommand` baseado em `includes()` por LLM (Gemini) que escolhe ferramentas.

### Entregas
- `supabase/functions/ai-orchestrator/index.ts` — Edge Function com `functionDeclarations` do Gemini.
- `src/core/toolRegistry.ts` — Registro único de ferramentas com contratos Zod.
- `src/core/orchestrator.ts` — Executor client-side + fallback keyword.
- Tabelas: `clientes`, `orchestrator_runs`, `projects.cliente_id`, `projects.nome`.
- IARA chat migrado para `runOrchestrator()`.

### Ferramentas v1 (contratos estáveis)
| Nome | Entrada | Saída | Alvo |
|---|---|---|---|
| `createCliente` | `{nome, email?, telefone?}` | `{id, nome}` | tabela `clientes` |
| `createProjeto` | `{nome, clienteNome?, width?, height?, depth?, tipo?}` | `{id, nome, width, height, depth}` | tabela `projects` |
| `gerarRender` | `{prompt, estilo?}` | `{studioCommandId, status}` | Command Bus → Estúdio |
| `calcularOrcamento` | `{observacoes?}` | `{total, materiais, maoDeObra}` | fórmula local |
| `gerarContrato` | `{clienteNome, valor?, prazoDias?, clausulasExtras?}` | `{cliente, valor, clausulasGeradas}` | tabela `custom_clauses` + Contrato |

### Critério de aceite
Prompt: *"Crie um projeto para o cliente João, gere uma imagem da cozinha planejada, calcule o orçamento e prepare um contrato."*
→ IA produz plano de 4-5 tool calls → executor roda em sequência → resposta consolidada no chat.

### Fallback
Se `ai-orchestrator` falhar tecnicamente (rede, quota, JSON inválido), o executor usa keyword matching (comportamento antigo). Zero downtime na migração.

---

## 🔜 IARA OS v2 — Planner Multi-Step (próximo)

Reutiliza o toolRegistry do v1. Adiciona controle de execução.

### Escopo
- **Plano estruturado**: `{ steps: [{id, tool, args, dependsOn?, status}] }`.
- **Estados por etapa**: `pending | running | completed | failed | skipped`.
- **Dependências**: `gerarContrato` só roda se `calcularOrcamento` completou; `gerarRender` só após `createProjeto`.
- **Progresso no chat**: cada step vira uma mensagem com badge de status atualizada via subscribe.
- **Retomada após falha**: usuário clica "tentar de novo esta etapa" sem refazer as anteriores.
- **Cancelamento**: interromper plano em execução.
- **Persistência**: tabela `orchestrator_plans` (id, run_id, steps jsonb, current_step).

### Novo contrato
```ts
interface PlanStep {
  id: string;
  tool: string;
  args: Record<string, any>;
  dependsOn?: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: ToolResult;
  attempts: number;
}
```

### Critério de aceite
Prompt complexo dispara 6+ etapas. Se etapa 3 falhar, etapas 4+ ficam `skipped`. Usuário retoma da etapa 3 sem perder as anteriores.

---

## 🔜 IARA OS v3 — Memória Cognitiva

Reutiliza toolRegistry + planner. Personaliza decisões sem alterar contratos.

### Tabela `iara_memory`
```sql
CREATE TABLE public.iara_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,  -- 'material' | 'fornecedor' | 'margem' | 'acabamento' | 'estilo' | 'regra_comercial' | 'preferencia'
  chave TEXT NOT NULL,       -- 'mdf_padrao', 'fornecedor_ferragens', 'margem_min'
  valor JSONB NOT NULL,
  peso NUMERIC DEFAULT 1.0,  -- reforço/decaimento por uso
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, categoria, chave)
);
```

### Fluxo
1. Antes de chamar `ai-orchestrator`, buscar top-N memórias relevantes por categoria.
2. Injetar como bloco `PREFERÊNCIAS DO USUÁRIO` no `systemInstruction`.
3. Após execução bem-sucedida, `saveMemory()` extrai novos padrões (ex: usuário sempre pediu MDF 18 branco → salva `material.mdf_padrao`).
4. Decaimento: memórias não usadas há 90 dias perdem peso.

### Categorias iniciais
- `material.mdf_padrao`, `material.tampo_padrao`
- `fornecedor.ferragens`, `fornecedor.mdf`
- `comercial.margem_min`, `comercial.prazo_padrao`
- `estilo.decor_default`, `estilo.paleta_favorita`
- `regra.parede_torta_sempre`, `regra.pipes_sempre`

### Critério de aceite
Após 5 projetos consecutivos usando MDF 18 branco, novo pedido de "cozinha" pré-preenche esse material sem o usuário mencionar.

---

## 🧰 Sprints paralelas (do plano anterior)

Ainda pendentes, atacáveis em paralelo ao IARA OS quando fizer sentido:

### 🔴 Fundação
1. **Núcleo central de estado** (`src/core/useCore.ts` unificando auth + bus + permissões).
2. **RLS + permissões por módulo** (roles `owner/editor/viewer`, `requirePermission()` antes de mutações, rate limit nas Edge Functions).
3. **Testes automatizados** (Vitest para services/registry, Playwright E2E para fluxo IARA→Estúdio→Portal→Estela).

### 🟡 Consistência
4. **Segregação de responsabilidades** (IARA só interpreta, Estúdio só renderiza, Portal só apresenta, Estela só calcula).
5. **Persistência do Command Bus** em `command_history` (sync device A ↔ device B).

### 🟢 Polimento
6. **Performance** (React.lazy nos módulos pesados, seletores Zustand com shallow, compressão de imagens).
7. **SEO por rota** (react-helmet-async, sitemap dinâmico).
8. **Observabilidade** (log estruturado nas Edge Functions, `/admin/health` gated por role).

---

## Ordem sugerida

```text
Agora:       IARA OS v1 (Function Calling)     ← em execução
Próximo:     IARA OS v2 (Planner) + Sprint 🔴 #3 (testes cobrindo v1)
Depois:      IARA OS v3 (Memória) + Sprint 🔴 #2 (RLS/roles)
Paralelo:    Sprints 🟡 e 🟢 conforme dor surgir
```
