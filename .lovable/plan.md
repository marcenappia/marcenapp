# Correção end-to-end do render da IARA

## Objetivo
Garantir que um pedido de render na conversa atravesse toda a fila, gere uma imagem real no backend, persista o resultado e publique a imagem final no mesmo contexto da IARA.

## Diagnóstico confirmado
- O commit esperado `49fddda` é ancestral do estado atual; a branch de trabalho está à frente dele.
- O código já monta o `StudioWorker` no nível da aplicação e mantém os comandos em stores persistidas.
- O backend conectado está defasado do código: não possui `project_iara_contexts` nem as colunas de contexto em `gallery_images` e `chat_messages`. Assim, a validação do worker e a persistência final falham antes de completar o fluxo.
- Não há evidência recente de chamada à função `ai-image` no ambiente conectado.
- A função `ai-image` ainda usa um contrato legado de imagem em `/chat/completions`; o catálogo atual confirma o modelo solicitado, mas a rota documentada é `/v1/images/generations`.
- A entrega final depende de um `Map` em memória no hook da conversa; após remontagem/reload, um comando concluído pode não ser associado novamente ao chat.

## Implementação
1. Aplicar uma migração idempotente que alinhe as tabelas e colunas de contexto exigidas pelo fluxo, com grants, RLS e índices preservados.
2. Tornar a identidade da execução recuperável do estado persistido, para que a mensagem final não dependa apenas de memória React.
3. Corrigir o contrato backend da geração Lovable para a rota/formato atual de imagens, mantendo secrets somente no servidor, autenticação, rate limit, créditos e erros seguros.
4. Manter uma única fila existente; ajustar a conclusão para persistir galeria e chat de forma idempotente e vinculada por `correlationId`/geração.
5. Adicionar regressões cobrindo: despacho executável, recuperação após remontagem, chamada até `callAIImage`, persistência da galeria e publicação única da mensagem final com `image_url`.
6. Publicar a função alterada e testar uma chamada autenticada real; consultar logs e registros resultantes.

## Validação
- Testes focados de IARA/Studio e função `ai-image`.
- TypeScript, ESLint e suíte de testes aplicável.
- Validação real da função e evidência observável de imagem, ou registro preciso do bloqueio externo.
- Conferência final do diff, branch e commit local gerado pela plataforma.
