# Marcenapp — Arquitetura Diário → Cliente → Projeto → Ambientes → YARA

## Status

Arquitetura de referência para evolução do produto. O objetivo é preservar o contexto já existente da IARA/YARA e tornar o Diário a porta de entrada operacional do marceneiro.

## Princípio central

O marceneiro não deve precisar conhecer tecnologia, IA, agentes ou estrutura de banco para começar a trabalhar.

O ponto de entrada é o **Diário**. O Diário organiza a vida da marcenaria e a YARA trabalha sempre dentro do contexto correto, sem misturar clientes, obras/projetos ou ambientes.

> **Diário → Cliente → Projeto/Obra → Ambientes → YARA → Project Model → Capacidades/Artefatos**

## Hierarquia canônica

```text
DIÁRIO
│
├── CLIENTES
│   │
│   ├── João
│   │   │
│   │   ├── PROJETO/OBRA: Apartamento 305
│   │   │   │
│   │   │   ├── Cozinha
│   │   │   ├── Sala
│   │   │   ├── Quarto
│   │   │   └── Banheiro
│   │   │
│   │   └── PROJETO/OBRA: Apartamento 206
│   │       ├── Cozinha
│   │       └── Quarto
│   │
│   └── Maria
│       └── PROJETO/OBRA: Casa
│           ├── Cozinha
│           └── Closet
│
└── REGISTROS DO DIA
    ├── Áudio
    ├── Fotos
    ├── Anotações
    ├── Medidas
    ├── Pendências
    └── Próximas ações
```

### Regra de contexto

Cada conversa da YARA deve carregar explicitamente:

```text
userId
  ↓
clientId
  ↓
projectId / obraId
  ↓
environmentId (quando aplicável)
  ↓
projectVersionId
  ↓
conversationId
```

Uma conversa nunca pode recuperar ou alterar dados de outro cliente ou outro projeto apenas porque o mesmo nome foi usado.

## Cliente nasce no Diário

O cadastro operacional do cliente deve ser iniciado pelo Diário. Não criar um fluxo paralelo de cadastro que obrigue o usuário a sair do Diário.

A partir do cliente, o marceneiro cria uma ou mais obras/projetos:

- João → Apartamento 305
- João → Apartamento 206
- João → Casa de praia

O mesmo cliente pode possuir projetos completamente independentes.

## Projeto/obra e ambientes

O projeto/obra representa o trabalho daquele cliente em um imóvel, obra ou escopo específico.

Dentro dele existem ambientes independentes, por exemplo:

- cozinha;
- sala;
- quarto;
- banheiro;
- closet;
- lavanderia;
- escritório.

Um projeto pode ter vários ambientes e o usuário pode trabalhar neles separadamente.

### Separação operacional

A YARA pode trabalhar em:

```text
João / Apartamento 305 / Cozinha
```

sem perder a possibilidade de consolidar posteriormente:

```text
João / Apartamento 305
├── Cozinha
├── Sala
├── Quarto
└── Banheiro
```

## YARA por contexto

A YARA deve ser percebida pelo usuário como uma assistente que conhece aquele trabalho específico.

Exemplo:

> João → Apartamento 305 → Cozinha

O chat da YARA recebe e mantém o contexto da cozinha. Fotos, medidas, decisões, revisões e artefatos produzidos ali ficam vinculados ao mesmo Project Model/versionamento.

Ao trabalhar na sala, a YARA muda o `environmentId`, mas continua dentro do mesmo projeto quando for o mesmo apartamento.

Quando o usuário trocar para outro projeto:

> João → Apartamento 206

nenhuma informação do Apartamento 305 deve ser usada como contexto operacional, salvo quando uma ação explícita de consolidação ou comparação pedir isso.

## Projeto unificado, ambientes separados

O relatório final do projeto deve ser consolidado por projeto/obra, mas organizado por ambiente.

Exemplo:

```text
RELATÓRIO — JOÃO / APARTAMENTO 305

01. Cozinha
    - levantamento
    - medidas
    - decisões
    - render
    - desenho técnico
    - orçamento
    - pendências

02. Sala
    - levantamento
    - medidas
    - decisões
    - render
    - desenho técnico
    - orçamento
    - pendências

03. Quarto
    ...

04. Resumo geral
    - valores
    - materiais
    - ferragens
    - produção
    - pendências gerais
```

A separação por ambiente é de organização e rastreabilidade; não significa criar um novo cliente ou um novo projeto para cada cômodo.

## Diário e YARA

O Diário é a camada de entrada de informação humana.

```text
ÁUDIO / FOTO / TEXTO / MEDIDA
             ↓
           DIÁRIO
             ↓
      normalização local
             ↓
            YARA
             ↓
       PROJECT MODEL
             ↓
       ambiente/projeto
             ↓
 ┌───────────┼────────────┐
 ↓           ↓            ↓
Render     Técnico     Orçamento
 ↓           ↓            ↓
Apresent.  Produção    Pedido
```

### Áudio

A estratégia de custo é local/browser-first:

```text
Áudio
 ↓
Transcrição local quando disponível
 ↓
Texto
 ↓
Diário
```

Serviço pago de transcrição só deve ser acionado quando houver necessidade real de fallback/qualidade, evitando custo recorrente desnecessário.

A transcrição não deve ser confundida com a interpretação pela YARA. São camadas diferentes:

1. capturar;
2. transcrever;
3. estruturar;
4. confirmar;
5. incorporar ao Project Model.

## YARA dentro do Diário

A ativação da YARA deve ser contextual e educativa.

Exemplo:

> **Diário — João / Apartamento 305 / Cozinha**
>
> Você já registrou medidas, uma foto e uma observação.
>
> **Quer que a YARA organize isso?**
>
> [Analisar ambiente] [Criar projeto] [Conferir medidas]

O usuário não precisa escrever um prompt técnico.

## Project Model como fonte única

O Diário não cria uma segunda base de conhecimento independente da YARA.

O Diário alimenta o Project Model canônico. A YARA interpreta e enriquece esse modelo. As demais capacidades consomem o mesmo modelo.

```text
              PROJECT MODEL
                    │
        ┌───────────┼────────────┐
        ↓           ↓            ↓
     Diário       YARA      Capacidades
                                │
               ┌────────────────┼───────────────┐
               ↓                ↓               ↓
          Documentação       Orçamento       Produção
```

## Versionamento e rastreabilidade

Toda alteração relevante deve estar vinculada a uma versão do projeto.

A combinação mínima de rastreabilidade é:

```text
clientId
projectId
environmentId
projectVersionId
conversationId
artifactId
```

Artefatos devem registrar origem, versão e evidências. Uma revisão da cozinha não pode alterar silenciosamente a versão aprovada da sala.

## Regras de segurança de contexto

1. Nunca misturar clientes.
2. Nunca misturar projetos do mesmo cliente automaticamente.
3. Nunca misturar ambientes sem solicitação explícita.
4. Uma imagem deve ter vínculo de projeto/ambiente quando incorporada ao Project Model.
5. A YARA deve declarar quando está usando contexto de projeto inteiro versus contexto de um ambiente.
6. Relatórios consolidados devem preservar a divisão por ambiente.
7. Uma alteração deve gerar nova versão quando atingir artefato aprovado/congelado.
8. Nenhuma medida técnica deve ser inventada.

## Experiência para dois perfis

### Marceneiro que trabalha sozinho

Fluxo simples:

```text
Abrir Diário
 → escolher cliente
 → escolher projeto
 → falar/gravar
 → YARA ajuda quando necessário
```

Ele não precisa conhecer IA para obter valor.

### Marcenaria estruturada

O mesmo contexto permite:

```text
Cliente
 → Projeto
 → Ambientes
 → equipe/contexto
 → YARA
 → documentação
 → orçamento
 → produção
 → integrações
```

A complexidade fica disponível sem aparecer como complexidade obrigatória.

## Regra de UX

**A interface deve ensinar no momento em que o usuário precisa, e não exigir que ele aprenda o sistema antes de trabalhar.**

Mensagens devem ser humanas e acionáveis:

- “Falta a largura desta parede.”
- “Encontrei uma janela. Confira a posição.”
- “Ainda não tenho medida suficiente para liberar a produção.”
- “Quer transformar essas anotações em um projeto?”

Evitar mensagens técnicas como:

- “agent dependency missing”;
- “tool registry failure”;
- “invalid project context”.

Esses detalhes pertencem ao diagnóstico interno/QA, não ao usuário final.
