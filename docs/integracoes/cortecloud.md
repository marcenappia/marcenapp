# Integração Cortecloud

A integração do MARCENAPP com o Cortecloud fica isolada em duas camadas:

- `src/integrations/cortecloud/`: contrato e cliente usado pela aplicação/Agentes.
- `supabase/functions/cortecloud/`: gateway server-side que guarda as credenciais e chama a API Cortecloud.

## Credenciais

Nunca colocar credenciais do Cortecloud em `VITE_*`, no React, no navegador ou no Git.

Configurar como secrets da Supabase Edge Function:

```text
CORTECLOUD_API_BASE_URL=https://apis.ccstg.com.br
CORTECLOUD_EMAIL=<credencial fornecida pelo Cortecloud>
CORTECLOUD_PASSWORD=<credencial fornecida pelo Cortecloud>
CORTECLOUD_API_KEY=<Client API key ou Partner API key fornecida pelo Cortecloud>
```

Para produção, usar a URL e a chave de produção fornecidas pelo Cortecloud após homologação. A documentação oficial informa que o fornecedor/ERP solicita token de testes, implementa a integração, passa por homologação e recebe a credencial definitiva para produção.

## O que o adaptador suporta

- consultar serviços aprovados;
- consultar um serviço específico;
- marcar um serviço importado pelo ERP usando `internal_code`;
- consultar chapas, fitas e componentes;
- consultar um material específico;
- atualizar preço, estoque, unidade e ativo de materiais quando a conta integrada tiver essa permissão.

## Limite importante da API

A API documentada pelo Cortecloud não cria materiais nem cria pedidos/serviços. Ela expõe consulta/atualização de materiais e captura de serviços/pedidos aprovados. Portanto, o MARCENAPP não deve simular uma criação de orçamento no Cortecloud via API.

O fluxo correto será:

1. MARCENAPP/Yara monta projeto, peças e necessidade de materiais.
2. O agente de materiais consulta preços/estoque reais disponíveis na integração.
3. O agente de orçamento calcula o orçamento comercial do MARCENAPP.
4. Quando houver um serviço aprovado no Cortecloud, o agente de pedidos pode capturá-lo e registrar o `internal_code` no Cortecloud.
5. O orçamento apresentado ao cliente deve indicar claramente quais valores vieram do Cortecloud e quais são margem/custos próprios do MARCENAPP.

## Ações internas

Os IDs de ferramentas/ações devem permanecer estáveis para o futuro roteador de agentes:

- `cortecloud.services.list`
- `cortecloud.services.get`
- `cortecloud.services.markImported`
- `cortecloud.materials.list`
- `cortecloud.materials.get`
- `cortecloud.materials.update`

## Homologação

Antes de colocar a integração em produção:

1. obter credenciais de teste diretamente com o Cortecloud;
2. configurar os secrets no projeto Supabase;
3. testar somente operações de leitura primeiro;
4. testar atualização de `internal_code` e materiais em ambiente autorizado;
5. solicitar homologação ao Cortecloud;
6. substituir pelos dados de produção fornecidos após homologação.
