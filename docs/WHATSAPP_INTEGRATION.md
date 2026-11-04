# WhatsApp no Marcenapp

A integração usa a WhatsApp Cloud API da Meta. O Marcenapp recebe mensagens por webhook, grava a conversa e permite responder pelo Supabase Edge Function. Tokens nunca ficam no frontend.

## Edge Functions

- `whatsapp-webhook`: recebe a verificação GET da Meta, mensagens recebidas e status de entrega.
- `whatsapp-send`: envia mensagens de texto usando o `phone_number_id` da integração autenticada.

## Secrets do Supabase

```bash
supabase secrets set \
  WHATSAPP_VERIFY_TOKEN="um-segredo-longo-gerado-por-voce" \
  WHATSAPP_ACCESS_TOKEN="token-permanente-do-system-user" \
  WHATSAPP_GRAPH_VERSION="v23.0"
```

O token permanente deve ser criado no Meta Business Manager usando um System User com a permissão `whatsapp_business_messaging`. A Meta recomenda não usar o token temporário do Quickstart em produção.

## Configuração da conta

1. Criar ou abrir um App no Meta for Developers com o caso de uso WhatsApp.
2. Conectar o WhatsApp Business Account e registrar o número comercial.
3. Copiar o `phone_number_id` e o ID da conta Business.
4. Configurar o callback da Meta para:

```text
https://uzhqhieqlcyncelltfjw.supabase.co/functions/v1/whatsapp-webhook
```

5. Usar o mesmo valor de `WHATSAPP_VERIFY_TOKEN` na tela de verificação da Meta.
6. Assinar o campo `messages` do webhook.
7. Inserir o `phone_number_id` do número comercial em `whatsapp_integrations`, associado ao usuário do Marcenapp.

Exemplo SQL administrativo:

```sql
insert into public.whatsapp_integrations
  (user_id, phone_number_id, business_account_id, display_phone_number, display_name)
values
  ('ID_DO_USUARIO', 'PHONE_NUMBER_ID', 'BUSINESS_ACCOUNT_ID', '+55...', 'Minha Marcenaria');
```

## Regras importantes da Meta

Mensagens recebidas são idempotentes pelo `external_message_id`. A Meta pode reenviar webhooks quando o endpoint não retorna HTTP 200. Para mensagens iniciadas pela empresa fora da janela de atendimento, será necessário usar um template aprovado pela Meta; a função inicial implementa texto livre para conversas autorizadas dentro da janela de atendimento.

## Próxima camada da IARA

Depois que o webhook estiver recebendo mensagens, o próximo passo é uma fila de atendimento que:

1. associa o número ao cliente;
2. identifica o projeto ativo;
3. envia o texto para o `ai-orchestrator`;
4. pede confirmação antes de criar orçamento, contrato ou cobrança;
5. registra a decisão e responde pelo WhatsApp.
