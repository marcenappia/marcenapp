# Integração Marcenapp + Marcenaria Mágica

## Responsabilidades

O **Marcenaria Mágica** é o motor de render. Seu endpoint server-side `/api/marcenaria-render` recebe uma foto de referência e um prompt, executa o `runRender` com o modelo `openai/gpt-image-2.5-sunburst` e devolve uma imagem PNG em `data URL`.

O **Marcenapp** continua sendo o sistema de gestão. A Edge Function `ai-image` autentica o usuário, valida o contexto da IARA, consome créditos, chama o motor externo, grava a imagem no Storage `obras`, cria o registro em `gallery_images` e devolve `requestId`/`renderId` para o painel e o Ledger.

## Contrato server-to-server

Configure no ambiente da Edge Function do Marcenapp:

```bash
supabase secrets set \
  MARCENARIA_MAGICA_RENDER_URL="https://<deployment>/api/marcenaria-render" \
  MARCENARIA_MAGICA_RENDER_SECRET="<segredo-compartilhado>" \
  MARCENARIA_MAGICA_RENDER_MODEL="marcenaria-magica-render-v1"
```

O Marcenapp envia:

```json
{
  "prompt": "...instrução de render...",
  "image": {
    "mimeType": "image/jpeg",
    "data": "...base64 sem o prefixo data URL..."
  }
}
```

No header `X-Marcenapp-Render-Secret`, o valor precisa ser igual ao secret configurado na Marcenaria Mágica. A resposta esperada é:

```json
{
  "imageBase64": "data:image/png;base64,...",
  "model": "openai/gpt-image-2.5-sunburst"
}
```

## Ordem de publicação

1. Publicar a Marcenaria Mágica com `MARCENARIA_MAGICA_RENDER_SECRET` e `LOVABLE_API_KEY` configurados no servidor.
2. Confirmar `POST /api/marcenaria-render` com uma chamada autenticada pelo header compartilhado. Não executar esse teste com uma imagem de cliente real sem autorização.
3. Configurar no Supabase do Marcenapp `MARCENARIA_MAGICA_RENDER_URL`, `MARCENARIA_MAGICA_RENDER_SECRET` e, opcionalmente, `MARCENARIA_MAGICA_RENDER_MODEL`.
4. Publicar a Edge Function `ai-image` do Marcenapp.
5. Selecionar `marcenaria_magica` na tabela `ai_provider_settings` para o usuário ou deixar `automatic` quando houver foto de referência.
6. Executar o smoke E2E. O critério de sucesso é observar `[IMAGE_RECEIVED]`, `[STORAGE_WRITE]`, `[DATABASE_WRITE]` e uma linha correspondente em `gallery_images`.

## Segurança

O segredo compartilhado nunca deve aparecer em `VITE_*`, no navegador, no repositório ou no payload JSON. A chamada é feita exclusivamente pela Edge Function do Marcenapp. O endpoint da Marcenaria Mágica não aceita sessão do usuário do Marcenapp; ele aceita somente o segredo server-to-server e valida prompt, MIME e tamanho da foto.

## Estado atual

O adaptador já está implementado no Marcenapp e o endpoint protegido já está implementado na Marcenaria Mágica. Ainda é necessário informar o domínio de deploy da Marcenaria Mágica e configurar os dois secrets em produção antes de afirmar que o render está operacional no site publicado.
