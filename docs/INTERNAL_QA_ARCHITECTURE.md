# Marcenapp — QA Interno Estrutural

## Objetivo

O Marcenapp deve testar internamente as próprias capacidades antes de depender de marceneiros beta para descobrir falhas básicas.

O beta humano deve validar principalmente experiência, clareza e utilidade real — não servir como substituto de testes automatizados.

## Pipeline obrigatório

```text
CÓDIGO
  ↓
UNIT
  ↓
SERVIÇOS
  ↓
TOOLS
  ↓
AGENTES
  ↓
IARA / DIÁRIO
  ↓
JORNADAS
  ↓
REGRESSÃO
  ↓
PLAYWRIGHT
  ↓
SEGURANÇA
  ↓
CUSTO / LATÊNCIA
  ↓
PRODUCTION GATE
  ↓
BETA HUMANO
```

## Princípio de custo

Testes determinísticos devem vir primeiro.

Nenhum teste deve chamar IA paga quando uma asserção determinística consegue validar o mesmo contrato.

Avaliações com modelo devem ser reservadas para comportamento que realmente exige julgamento semântico.

```text
regra/cálculo/estrutura/geometria
        → código

comportamento semântico/qualidade de resposta
        → modelo, somente quando necessário
```

## Matriz por capacidade

Cada capacidade deve declarar:

- entrada mínima;
- contexto exigido;
- ferramentas permitidas;
- artefatos esperados;
- status válidos;
- blockers;
- validações;
- limite de custo;
- limite de latência;
- regras de segurança;
- requisitos de versionamento.

Exemplo: `gerar render`

```text
Entrada
 ├── texto OU referência visual
 ├── projectId quando contextual
 └── environmentId quando aplicável

QA
 ├── contexto correto
 ├── referências preservadas
 ├── tool correta
 ├── idempotência
 ├── sem medidas inventadas
 ├── resultado rastreável
 ├── falha/retry seguro
 └── cobrança única
```

## Testes do Diário

O Diário precisa de testes próprios porque é a porta de entrada do produto.

### Jornada mínima

```text
novo cliente
 → nova obra/projeto
 → selecionar ambientes
 → registrar texto
 → registrar áudio
 → transcrição
 → organizar registro
 → ativar YARA
 → incorporar ao Project Model
```

### Isolamento

Testar automaticamente:

- cliente A não acessa projeto do cliente B;
- projeto 305 não acessa projeto 206;
- cozinha não altera sala sem ação explícita;
- troca de projeto troca o contexto da YARA;
- troca de ambiente preserva o projeto correto;
- relatório consolida o projeto sem misturar ambientes.

## Testes da YARA

Fixtures devem representar usuários reais e linguagem natural, não somente prompts técnicos.

Exemplos:

> “Fui medir a cozinha do João hoje.”

> “A parede da direita tem uma janela.”

> “Quero fazer esse quarto, mas ainda não medi a altura.”

> “Tenho o projeto pronto. Só quero o desenho técnico e o orçamento.”

O QA verifica intenção, contexto, perguntas necessárias, artefatos e blockers.

## Testes de honestidade técnica

Especialmente para projeto, medição, desenho técnico e produção:

> **Nunca transformar estimativa em medida validada.**

O QA deve rejeitar resultados que apresentem como medido aquilo que só foi inferido.

Dimensões técnicas devem ter origem rastreável:

1. medida informada pelo usuário;
2. geometria validada;
3. regra de engenharia explícita;
4. inferência declarada com incerteza.

## Testes de jornada

### Jornada A — diário simples

```text
Cliente
 → Projeto
 → Registro
 → Diário
```

Sem IA paga obrigatória.

### Jornada B — diário + YARA

```text
Diário
 → YARA
 → Project Model
```

### Jornada C — foto → projeto

```text
Foto
 → análise
 → ambiente
 → projeto
```

### Jornada D — planta + fotos

```text
Planta
 + Fotos
 → geometria/contexto
 → Project Model
```

### Jornada E — projeto → cliente

```text
Projeto
 → render/documentação
 → revisão do cliente
 → aprovar OU solicitar alteração
```

### Jornada F — aprovado → produção

```text
Aprovação
 → engenharia
 → materiais
 → corte
 → auditoria
 → orçamento/pedido
 → freeze
 → pacote de produção
```

A ausência de aprovação deve impedir avanço para produção.

## Playwright

Playwright deve cobrir os caminhos críticos do usuário, não todas as combinações possíveis.

Smoke obrigatório:

1. entrar;
2. abrir Diário;
3. criar/selecionar cliente;
4. abrir projeto;
5. selecionar ambiente;
6. registrar informação;
7. abrir YARA;
8. executar ação segura;
9. verificar resultado/artefato;
10. voltar ao Diário sem perder contexto.

## Falhas e diagnóstico

Cada falha deve registrar:

- capability;
- journey;
- input fixture;
- project/client/environment context;
- tool/agent;
- erro;
- custo;
- latência;
- tentativa/retry;
- commit;
- execução CI.

O diagnóstico interno pode ser técnico. A mensagem apresentada ao marceneiro deve ser humana e acionável.

## Gate de liberação

Uma capacidade não deve ser considerada pronta apenas porque o TypeScript compila.

Gate mínimo:

```text
[ ] unit
[ ] service
[ ] tool
[ ] agent
[ ] journey
[ ] regression
[ ] Playwright crítico
[ ] contexto/RLS
[ ] custo dentro do orçamento
[ ] latência aceitável
[ ] artefato verificável
[ ] retry/idempotência segura
[ ] production gate, quando aplicável
```

## Estratégia de execução

### Em cada push

Executar testes rápidos e determinísticos.

### Em mudanças de capacidade

Executar a matriz específica da capacidade + jornadas afetadas + regressão.

### Antes de release

Executar suíte completa, incluindo Playwright e avaliações semânticas necessárias.

### Avaliação de IA

Usar somente os casos que precisam de avaliação semântica. Registrar custo e tendência de regressão.

## Princípio final

O objetivo do QA não é produzir relatórios bonitos.

O objetivo é **impedir que uma funcionalidade quebrada chegue ao marceneiro** e detectar regressões antes do uso real.
