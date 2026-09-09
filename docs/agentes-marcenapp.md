# MARCENAPP — Arquitetura dos Agentes Especialistas

## Objetivo
Definir a banca técnica da MARCENAPP para transformar dados da obra em resultado comercial e técnico confiável, sem alterar a jornada principal do usuário.

Jornada preservada: cadastrar cliente → informar obra → adicionar fotos → descrever pedido → IARA confere dados → apresentação → aprovação → orçamento → produção.

Os agentes trabalham por baixo dessa jornada. Eles não criam uma segunda interface nem mudam o fluxo sem decisão explícita do produto.

## Contrato de execução
Cada agente recebe `correlationId`, entrada original e resultados das dependências. O resultado pode ser `completed`, `needs_input` ou `failed`, com `confidence`, `evidence`, `warnings`, `blockers` e `assumptions` quando aplicável. Incerteza nunca deve virar silenciosamente uma medida ou decisão comercial.

## Banca técnica — 20 especialistas
1. **Cliente** — contexto comercial mínimo.
2. **Projeto** — obra vinculada ao cliente.
3. **Visão e Leitura do Ambiente** — paredes, piso, teto, portas, janelas, pilares e obstáculos; não inventa dimensões.
4. **Perspectiva e Geometria** — orientação, planos e perspectiva com evidência suficiente.
5. **Medidas** — medidas fornecidas/medidas calibradas, unidade e plausibilidade.
6. **Predição de Medidas** — somente com escala, calibração ou modelo adequado; carrega incerteza.
7. **Conferência Multivista** — reconcilia vistas e bloqueia contradições não resolvidas.
8. **Engenharia do Móvel** — módulos, divisões, portas, gavetas, prateleiras, espessuras, folgas e ferragens.
9. **Materiais** — normalização de materiais, espessuras, unidades e códigos.
10. **Otimização de Chapa e Corte** — restrições reais de chapa, veio, rotação, kerf, margens e quantidade; não declara ótimo sem motor reproduzível.
11. **Auditoria de Corte** — barreira independente para cobertura, duplicidade, peças extras, dimensões, limites e sobreposição.
12. **Render Técnico** — representa o pacote técnico validado; não altera engenharia para embelezar.
13. **Qualidade** — consolida bloqueadores técnicos antes da apresentação.
14. **Apresentação** — material do cliente após validações.
15. **Aprovação** — registra decisão e libera etapas posteriores.
16. **Estoque** — disponibilidade dos materiais.
17. **Produção** — lista de corte e dados operacionais.
18. **Orçamento** — cálculo baseado em materiais, produção, aprovação e estoque; Cortecloud é adaptador externo.
19. **Documentos** — documentos comerciais/técnicos consolidados.
20. **Pedido** — pedido ligado a cliente, projeto, orçamento e aprovação.

## Dependências canônicas
Fluxo técnico: `customer → project → vision → perspective → measurement → measurement_prediction → multiview → furniture_engineering → materials → cut_optimization → cut_audit`.

Render/qualidade: `multiview + furniture_engineering + materials → render → quality → presentation → approval`.

Operacional/comercial: `materials → inventory → production → budget → documents/order`.

As dependências são a fonte de verdade em `src/lib/agents/registry.ts`. A implementação compartilhada está em `types.ts`, `factory.ts` e `orchestrator.ts`.

## Regras de bloqueio
Não avançar automaticamente com medida sem unidade/fora de faixa, previsão sem calibração, conflito entre vistas, peça fora da chapa, sobreposição, quantidade divergente, peça não solicitada, material incompatível, render sem pacote técnico validado ou orçamento dependente de dado técnico incerto que altere preço.

## Estado da sincronização
A arquitetura dos 20 agentes foi sincronizada seletivamente da `main` para a branch de produção, sem substituir o restante da branch. Skills (`.agents/skills`) e agentes (`src/lib/agents`) permanecem camadas distintas: skills governam comportamento/integrações; agentes governam responsabilidades, dependências e contratos de execução.

## Próximos pontos
Conectar adaptadores reais de visão/perspectiva/medição, multivista, pacote técnico versionado para render, otimização real de corte, auditoria independente, orçamento profissional e cobertura E2E/CI.
