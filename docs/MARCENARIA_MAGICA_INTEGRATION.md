# Integração Marcenapp + Marcenaria Mágica

## Estado atual: motor nativo dentro do Marcenapp

O motor da **Marcenaria Mágica** (`runRender`) foi portado para dentro da Edge Function
`supabase/functions/ai-image/index.ts`. Não existe serviço externo, endpoint HTTP dedicado,
`MARCENARIA_MAGICA_RENDER_URL`, `MARCENARIA_MAGICA_RENDER_SECRET` ou modelo configurável por
ambiente: o render fotorrealista roda na mesma função que já atende o Studio.

- Endpoint do gateway: `POST https://ai.gateway.lovable.dev/v1/images/edits` (multipart).
- Modelo fixo: `openai/gpt-image-2.5-sunburst`, exatamente o do código original.
- Credencial: a `LOVABLE_API_KEY` já configurada no projeto. Nenhuma variável nova é necessária.
- Resposta: eventos SSE (`image_edit.completed` / `image_generation.completed`) e, quando o
  gateway não envia eventos, uma repetição não-streaming lida como JSON (`data[0].b64_json`).
- Saída: `imageBase64` em data URL (`data:image/png;base64,...`), compatível com o `StudioWorker`.

O `ai-image` continua sendo o único ponto de entrada: autenticação, validação do contexto IARA,
idempotência, consumo e estorno de créditos, gravação no Storage `obras` e o registro em
`gallery_images` seguem inalterados.

## Fluxo

1. A Yara/IARA entende o pedido, o contexto do projeto/ambiente/versão e a foto ou croqui.
2. A ferramenta `gerarRender` enfileira o comando no Studio com as referências do contexto atual.
3. O `ai-image` valida autenticação, contexto e créditos e seleciona o provider.
4. Com imagem de referência, a Marcenaria Mágica é o provider prioritário; sem referência, o
   motor é inaplicável e o fluxo usa o provider genérico configurado.
5. O motor recebe a **imagem principal** do contexto como base da edição, junto do prompt de
   preservação de arquitetura, proporções e layout, e devolve o PNG renderizado.
6. A imagem é gravada no Storage `obras`, registrada em `gallery_images` e devolvida ao chat da
   Yara e à galeria do projeto.

## Seleção de provider

`supabase/functions/ai-image/provider.ts` resolve o provider a cada execução:

- Referência presente → prioridade `marcenaria_magica` (disponível quando `LOVABLE_API_KEY` existe).
- Sem referência → o motor não é elegível; segue a ordem dos providers genéricos.
- Provider escolhido explicitamente em `ai_provider_settings` é contrato rígido: se estiver
  indisponível a execução falha com `provider_not_configured` em vez de trocar de motor.
- Quando `marcenaria_magica` é o provider primário (automático com referência ou escolhido
  explicitamente), o fallback é `null`: nenhum outro motor substitui a Marcenaria Mágica. Os
  providers genéricos mantêm a cadeia de fallback que já existia.

`supabase/functions/_shared/provider.ts` expõe a mesma regra de disponibilidade
(`providerAvailabilityFromEnv`) para os demais consumidores.

## Referências múltiplas

O motor original edita **uma** foto. O contrato é a **ordem** das referências: o `ai-image` usa
sempre `images[0]` como base da edição, e a IARA garante que essa posição seja a planta/foto
atual do pedido.

Em `src/modules/iara/services/planService.ts`, `recentVisualReferences` delega a
`orderPlanReferences` (`src/modules/iara/services/planReferences.ts`): a referência cujo
`data === currentPlan` é sempre movida para a primeira posição preservando `mimeType` e
`kind`; se ela não existir, é criada como `image/png`/`kind: 'plan'` e colocada em primeiro
lugar; duplicatas da planta atual são removidas; as demais referências mantêm a ordem atual; o
total é limitado a 8. Não existe marcação de "imagem principal" nas referências — apenas a
ordem.

As demais referências continuam no contexto do projeto (análise da planta e prompt do Studio),
mas apenas `images[0]` é enviada ao motor, e a seleção é registrada no log
`[MARCENARIA_MAGICA_REFERENCE]`.

## Configuração

Nada a configurar além do que já existe:

```bash
supabase secrets set LOVABLE_API_KEY="<chave-do-gateway-ja-usada-pelo-projeto>"
```

Segredos permanecem somente no backend: nenhum valor aparece em `VITE_*`, no navegador ou no
repositório.

## Verificação

1. Publicar a Edge Function `ai-image`.
2. Enviar um render com foto de referência pelo Studio ou pelo chat da Yara.
3. Confirmar nos logs `[PROVIDER_SELECTION]` com `provider: "marcenaria_magica"`,
   `[IMAGE_RECEIVED]`, `[STORAGE_WRITE]` e `[DATABASE_WRITE]`.
4. Confirmar a nova linha em `gallery_images` vinculada ao projeto/ambiente e a imagem no
   Storage `obras`.
5. Testes: `deno test supabase/functions/_shared/provider.test.ts` e os testes de contrato de
   `supabase/functions/ai-image/index_test.ts` (os testes HTTP exigem as variáveis do Supabase).

## Limites conhecidos

- O render depende da cota do gateway associada à `LOVABLE_API_KEY`; erros `401/402/403/429` são
  devolvidos ao app com código seguro, sem expor a credencial.
- O tempo total da geração é limitado a 110s dentro da Edge Function; ao estourar, a resposta é
  `provider_timeout` e o crédito é estornado.
