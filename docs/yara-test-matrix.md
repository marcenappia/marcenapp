# YARA — Test Matrix / Diff Contract

## Objetivo

Proteger o fluxo real **foto → comando → render → persistência → Studio** sem criar um segundo motor de IA.

## Matriz de regressão

| Etapa | Esperado | Falha que deve ser capturada |
|---|---|---|
| 1. Foto | preview permanece disponível | preview some antes do envio |
| 2. Comando | pedido visual é reconhecido | texto cai em criação de projeto |
| 3. Intent | `render` | `create_project` com referência visual |
| 4. Orquestração | `gerarRender` | `createProjeto` ganha prioridade |
| 5. Referência | imagem chega ao `ai-image` | referência perdida/URL transitória |
| 6. Provider | provider recebe referência | geração textual substitui imagem |
| 7. Resultado | imagem retorna | sucesso antes de existir imagem |
| 8. Persistência | `gallery_images` recebe o render | imagem não é persistida |
| 9. Studio | render aparece e permanece | resultado some ao mudar de tela |
| 10. Reabertura | referência/render continuam disponíveis | projeto reaberto perde contexto |
| 11. Mobile | mesmo contrato do desktop | bundle/estado divergente |
| 12. Erro | erro real + correlation id | erro genérico sem estágio |
| 13. Sem foto | não inventar referência | render tratado como se houvesse foto |
| 14. Projeto normal | criação continua funcionando | correção do render quebra create_project |

## Contrato de diff

Para cada falha de E2E/produção, registrar:

- **expectedStage**: estágio esperado;
- **actualStage**: estágio realmente atingido;
- **failureReason**: erro técnico real;
- **correlationId**: identificador do fluxo;
- **artifact**: imagem/projeto/render persistido, quando existir;
- **nextCheck**: próximo ponto objetivo a verificar.

Regra: **não repetir o mesmo teste sem mudar a hipótese**. O diagnóstico avança pelo primeiro estágio em que esperado ≠ real.

## Critério de aceite do P0

Com uma foto real anexada e um pedido de render:

1. a foto continua disponível;
2. a intenção final é `render`;
3. o plano executado contém `gerarRender`;
4. `createProjeto` não é executado como substituto;
5. width/height/depth não são exigidos apenas para render visual;
6. a geração só é considerada concluída quando houver imagem;
7. o resultado é persistido e exibido no Studio.

Os testes unitários são proteção contra regressão. Eles **não** são prova de geração real com provider. A prova final continua sendo um E2E com credenciais reais e uma imagem efetivamente persistida.
