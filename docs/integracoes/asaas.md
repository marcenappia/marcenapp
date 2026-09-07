# Integração Asaas — MARCENAPP

A integração está preparada para receber cobrança avulsa, Pix, boleto, cartão, parcelamento, assinaturas e Webhooks. A conexão real fica desligada até que as credenciais sejam configuradas com segurança.

## Credenciais de servidor

Configure **somente no ambiente das Edge Functions**, nunca no frontend:

- `ASAAS_API_KEY` — chave da conta Asaas.
- `ASAAS_ENVIRONMENT` — `sandbox` ou `production`.
- `ASAAS_WEBHOOK_TOKEN` — token exclusivo usado para autenticar o endpoint de Webhook.

O Asaas usa o header `access_token` para autenticação da API. Sandbox e Produção possuem URLs, contas e chaves independentes. citehttps://docs.asaas.com/docs/authenticationhttps://docs.asaas.com/docs/sandbox

## Endpoints preparados

Edge Function `asaas`:

- `connection_status`
- `list_customers`
- `create_customer`
- `create_payment`
- `get_payment`
- `get_pix_qr`
- `create_subscription`

Edge Function `asaas-webhook`:

- recebe eventos diretamente do Asaas;
- valida `asaas-access-token`;
- persiste o `event_id` com restrição única para evitar processamento duplicado;
- registra cobrança, cliente e assinatura relacionados;
- mantém o payload original para conciliação futura.

O Asaas recomenda Webhooks para acompanhar a mudança de estado das cobranças e usa o `event.id` como identificador do evento. citehttps://docs.asaas.com/docs/sobre-os-webhookshttps://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook

## Fluxo de cobrança

`Cliente MARCENAPP → cliente Asaas → cobrança → Pix/Boleto/Cartão → Webhook → conciliação MARCENAPP`

A criação da cobrança **não** significa que ela foi paga. O estado financeiro deve ser atualizado somente a partir da confirmação recebida pelo fluxo de Webhook. citehttps://docs.asaas.com/docs/guia-de-cobrancashttps://docs.asaas.com/reference/criar-nova-cobranca

## Assinaturas

A estrutura também suporta assinatura recorrente. O Asaas gera as cobranças de cada ciclo e o MARCENAPP deve acompanhar tanto os eventos da assinatura quanto os eventos das cobranças. citehttps://docs.asaas.com/docs/assinaturas

## Go-live

1. Criar/validar uma conta **Sandbox**.
2. Gerar a chave Sandbox.
3. Configurar os três secrets no ambiente das Edge Functions.
4. Apontar o Webhook do Sandbox para `asaas-webhook`.
5. Testar cliente, cobrança, Pix, boleto, assinatura e Webhook.
6. Somente após homologação, trocar `ASAAS_ENVIRONMENT` para `production` e usar uma chave de Produção.

Sandbox e Produção são ambientes independentes; dados e chaves não são compartilhados. citehttps://docs.asaas.com/docs/sandboxhttps://docs.asaas.com/docs/faq-sandbox

## Segurança

Não colocar `ASAAS_API_KEY` em `VITE_*`, localStorage, código React ou banco público. A chave fica exclusivamente na Edge Function. O frontend conversa somente com a função `asaas` através da sessão autenticada do usuário.
