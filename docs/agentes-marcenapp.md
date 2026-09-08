# MARCENAPP — Arquitetura dos Agentes Especialistas

## Objetivo

Definir a banca técnica da MARCENAPP para transformar dados da obra em um resultado comercial e técnico confiável, sem alterar a jornada principal do usuário.

Jornada preservada:

1. cadastrar cliente;
2. informar nome da obra;
3. adicionar fotos do ambiente;
4. descrever o pedido;
5. IARA confere os dados;
6. apresentação;
7. aprovação do cliente;
8. orçamento;
9. produção.

Os agentes trabalham por baixo dessa jornada. Eles não devem criar uma segunda interface nem mudar o fluxo sem decisão explícita do produto.

## Princípio de operação

Cada agente recebe uma tarefa com `correlationId`, entrada original e resultados das dependências. O resultado pode ser:

- `completed`: evidências suficientes para concluir a etapa;
- `needs_input`: falta dado obrigatório ou calibração;
- `failed`: erro de execução.

Um agente pode devolver `confidence`, `evidence`, `warnings`, `blockers` e `assumptions`. Incerteza não deve ser convertida silenciosamente em uma medida ou decisão comercial.

Regra de avanço:

- dado suficiente → executar;
- dado insuficiente → pedir entrada;
- evidência conflitante → alertar/bloquear;
- resultado inconsistente → bloquear;
- resultado validado → liberar a próxima etapa.

## Banca técnica

### 1. Cliente
Responsável por identificar/criar o cliente e fornecer o contexto comercial mínimo.

### 2. Projeto
Cria e mantém a obra, vinculando cliente e nome da obra.

### 3. Visão e Leitura do Ambiente
Analisa fotos/cenas para identificar paredes, piso, teto, portas, janelas, pilares, obstáculos e elementos existentes. Não deve inventar dimensões.

### 4. Perspectiva e Geometria
Analisa orientação espacial, planos da cena e perspectiva. Pontos de fuga e geometria estimada precisam de evidência visual suficiente.

### 5. Medidas
Trabalha com medidas fornecidas pelo usuário ou dados medidos/calibrados. Deve validar valores positivos, plausibilidade e unidade.

### 6. Predição de Medidas
Estima dimensões somente quando houver referência de escala, calibração ou modelo visual adequado. Toda previsão deve carregar incerteza.

### 7. Conferência Multivista
Compara fotos e perspectivas da mesma obra. Contradições entre vistas, medidas manuais e estimativas devem gerar alerta ou bloqueio, nunca uma escolha silenciosa.

### 8. Engenharia do Móvel
Converte requisitos em módulos construtivos: divisões, portas, gavetas, prateleiras, espessuras, folgas, ferragens e restrições de montagem.

### 9. Materiais
Normaliza materiais, espessuras, unidades e códigos. Deve preparar dados consistentes para orçamento, estoque e produção.

### 10. Otimização de Chapa e Corte
Gera/consome planos de corte respeitando dimensões, quantidade, espessura, veio, rotação permitida, kerf, margens e restrições de chapa/sobra. Não pode declarar “ótimo” sem motor de otimização reproduzível e validação independente.

### 11. Auditoria de Corte
É a barreira independente antes da produção. Confere cobertura das peças, duplicidade, peças não solicitadas, dimensões, limites da chapa e sobreposição. A validação geométrica não equivale a provar menor desperdício.

### 12. Render Técnico
Prepara a cena a partir do pacote técnico validado. O render deve representar o projeto; não deve alterar silenciosamente medidas ou engenharia para deixar a imagem bonita.

### 13. Qualidade
Consolida bloqueadores técnicos e verifica se medidas, materiais, corte e render estão coerentes antes da apresentação.

### 14. Apresentação
Monta o material que será mostrado ao cliente somente depois das validações necessárias.

### 15. Aprovação
Registra a decisão do cliente e libera as etapas comerciais posteriores quando aprovado.

### 16. Estoque
Confere disponibilidade dos materiais necessários e sinaliza faltas.

### 17. Produção
Prepara lista de corte e dados operacionais para fabricação a partir dos dados validados.

### 18. Orçamento
Calcula o orçamento a partir de materiais, produção, aprovação e dados de estoque. A integração Cortecloud deve ser tratada como adaptador externo: o MARCENAPP não deve fingir que a API executou uma operação que ela não oferece.

### 19. Documentos
Gera documentos comerciais/técnicos a partir de dados já consolidados.

### 20. Pedido
Mantém o pedido vinculado a cliente, projeto, orçamento e aprovação.

## Dependências

Fluxo técnico principal:

`customer → project → vision → perspective → measurement → measurement_prediction → multiview → furniture_engineering → materials → cut_optimization → cut_audit`

Depois:

`multiview + furniture_engineering + materials → render → quality → presentation → approval`

E o fluxo operacional/comercial utiliza:

`materials → inventory → production → budget → documents/order`

As dependências são definidas no registro dos agentes em `src/lib/agents/registry.ts`.

## Contrato de evidências

Toda inferência relevante deve, quando possível, indicar:

- fonte da evidência;
- valor observado/estimado;
- observação ou justificativa;
- nível de confiança;
- premissas utilizadas;
- alertas e bloqueadores.

Para medidas provenientes de imagem, o sistema deve distinguir explicitamente `measured`, `calibrated`, `estimated` e `unknown`.

## Política de bloqueio

Os seguintes casos não devem avançar automaticamente:

- medida sem unidade ou fora de faixa plausível;
- previsão de medida sem referência/calibração;
- conflito entre fotos que não foi reconciliado;
- peça fora da chapa;
- sobreposição de peças;
- quantidade solicitada diferente da quantidade colocada;
- peça não solicitada no plano;
- material/espessura incompatível;
- render baseado em pacote técnico não validado;
- orçamento baseado em dado técnico marcado como incerto quando isso puder alterar o preço.

## Auditoria e testes

A auditoria do corte deve permanecer independente do algoritmo que cria o plano. Os testes devem cobrir, no mínimo:

- cobertura exata de quantidades;
- peças duplicadas;
- peças ausentes;
- peças não solicitadas;
- dimensões inválidas;
- peça fora dos limites;
- sobreposição;
- rotação/veio quando aplicável;
- kerf e margens quando o motor real estiver conectado.

Para visão e multivista, adicionar testes de baixa confiança, ausência de escala e conflito entre vistas antes de considerar a etapa pronta para uso comercial.

## Estado atual da implementação

A estrutura de tipos, registro e orquestração dos agentes já existe no código. Parte dos agentes ainda funciona como fundação determinística e sinaliza `requiresModel` quando depende de visão/IA/otimização real. Isso é intencional: o sistema não deve simular uma análise que ainda não foi conectada a um motor real.

Próximas implementações prioritárias:

1. contratos/adaptadores reais de visão, perspectiva e medição;
2. conferência multivista com detecção de conflito;
3. pacote técnico versionado para alimentar o render;
4. motor de otimização de corte com restrições reais;
5. auditoria independente do plano de corte;
6. orçamento com uma única fórmula profissional e preços reais;
7. testes E2E e CI cobrindo bloqueios e regressões.
