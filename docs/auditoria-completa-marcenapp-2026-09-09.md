# Auditoria completa do Marcenapp — 09/09/2026

## Escopo

Varredura do repositório `marcenappia/marcenap40`, branch de recuperação `recovery/2026-09-09`, pipeline Playwright e projeto Supabase ativo `uzhqhieqlcyncelltfjw`.

## Resultado executivo

A auditoria encontrou problemas críticos já tratados nesta rodada e alguns módulos de negócio que ainda precisam de implementação para que o sistema seja considerado comercialmente completo.

### Corrigido nesta rodada

1. **Manifesto de dependências**: removida a segunda chave `dependencies` do `package.json`, que anulava silenciosamente as dependências de runtime.
2. **Playwright/CI**: o pipeline passou a usar `npm install`, instala os browsers e inicializa o servidor Vite automaticamente antes dos testes E2E.
3. **IARA/IA**: Edge Functions de IA em produção estão com `verify_jwt=true`; o guard valida o JWT com `auth.getUser`, aplica rate limit por usuário e restringe CORS.
4. **Rate limit**: o guard deixou de liberar a chamada quando o RPC de limite falha; agora falha fechado com HTTP 503.
5. **IA de texto**: runtime ativo inclui seleção automática de provedor Lovable/Gemini, fallback controlado, validação Zod, limite de payload e tratamento de 402/429/5xx.
6. **IA de imagem**: runtime ativo exige autenticação, aplica limite por usuário, valida dimensões/prompt/imagens e controla o payload.
7. **Orquestrador IARA**: runtime ativo exige autenticação/rate limit e usa function calling tipado, sem criar projeto com dimensões silenciosamente inventadas.
8. **Pricing**: foi criado motor centralizado de cálculo e o `toolRegistry` passou a consumir a mesma lógica, reduzindo divergência entre telas e IA.
9. **Clientes**: a recuperação implementou persistência real contra `public.clientes` em vez da lista puramente demonstrativa.
10. **Diário de Obra**: a recuperação implementou persistência real contra `public.diario_entradas`.
11. **Arquivo de ambiente**: removido `.env` do repositório; ele apontava para um projeto Supabase antigo. Criado `.env.example` e regras de `.gitignore` para impedir reincidência.

## Evidências de infraestrutura atual

- Projeto Supabase ativo: `uzhqhieqlcyncelltfjw`.
- Banco PostgreSQL 17.6.1.
- Edge Functions ativas: `ai-text`, `ai-image`, `ai-orchestrator`, `asaas`, `asaas-webhook`.
- `ai-text`, `ai-image` e `ai-orchestrator` estão publicados com `verify_jwt=true`.
- O RPC `consume_ai_rate_limit(uuid,text,integer,integer)` existe como `SECURITY DEFINER` e é usado pelo guard.
- O advisory de segurança não acusa RLS ausente em tabelas de negócio; os únicos casos RLS-sem-policy são `ai_rate_limits` e `asaas_webhook_events`, coerentes com acesso controlado por backend/webhook.

## Pendências que não devem ser mascaradas como concluídas

### P0/P1 — núcleo comercial

- **Tabela de preços editável persistida** ainda não existe no banco.
- **Contratos persistidos/PDF** ainda não estão completos como módulo comercial.
- **Plano de corte profissional** ainda precisa de kerf real no algoritmo de encaixe, veio/rotação, sobras e exportação de produção.
- **Ferragens/logística** ainda não formam um catálogo persistido completo.
- **Diário** e **Clientes** foram ativados, mas ainda precisam de acabamento de permissões, validações e cobertura E2E completa.
- **Análise de imagem para medidas** ainda precisa de faixa de plausibilidade e bloqueio explícito de uso de estimativa para fabricação/orçamento final.
- **Render** ainda precisa de uma única fila idempotente para todos os caminhos, evitando cobrança duplicada em retries.

### Qualidade

- O workflow atual comprova Playwright E2E, mas não substitui uma suíte CI completa de `lint`, `build` e testes unitários.
- O TypeScript ainda está com `strict=false`, `noImplicitAny=false` e `noUnused*` desabilitados.
- O banco apresenta avisos de performance em policies que usam `auth.*` sem `(select auth.*())`, múltiplas policies permissivas e índices ainda não utilizados. Esses avisos não representam quebra funcional imediata, mas devem ser tratados antes de escala.
- A proteção de senha vazada do Supabase Auth permanece desabilitada e requer habilitação nas configurações de Auth.

## Estado de produção

**IA**: bloqueadores de autenticação/rate limit estão corrigidos no runtime ativo.

**Aplicação web**: a branch de recuperação corrige dependências, inicialização do servidor E2E, pricing centralizado, Clientes e Diário.

**Banco**: saudável, com RLS ativo nas tabelas relevantes e advisories de performance/security documentados.

**Conclusão**: o Marcenapp saiu do estado de risco imediato identificado na auditoria de 05/09/2026. Ainda não é correto declarar o sistema 100% comercialmente concluído enquanto corte profissional, tabela de preços persistida, contratos/PDF, ferragens/logística, idempotência global de render e suíte completa de qualidade não estiverem fechados.

## Critério de encerramento definitivo

Considerar a auditoria encerrada somente quando: CI verde em lint + build + unit + E2E; runtime autenticado das três funções de IA comprovado; CRUD de Clientes/Diário comprovado; pricing persistido e editável; corte com kerf/veio/sobras/export; contratos persistidos/PDF; ferragens/logística; Storage para imagens; e advisories críticos zerados ou formalmente justificados.
