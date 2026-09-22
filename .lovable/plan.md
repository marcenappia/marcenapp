# Foto primeiro, destino depois na IARA

## Objetivo
Permitir que o marceneiro abra a câmera pela IARA mesmo sem projeto, preserve a foto capturada e escolha em seguida onde ela será cadastrada.

## Experiência
1. Manter a IARA compacta sem projeto, exibindo a conversa e o compositor com o menu inteligente e a câmera disponíveis.
2. Após uma foto de ambiente, abrir acima do compositor um painel compacto com: criar cliente, usar cliente existente, anexar a projeto existente ou continuar sem cadastrar.
3. Carregar clientes e obras reais somente do usuário autenticado. Na criação, pedir apenas nome do cliente e nome da obra, usando os mesmos valores vazios seguros já adotados pelo Diário.
4. Preservar a prévia durante toda a escolha e manter “continuar sem cadastrar” no fluxo atual de anexo pendente.

## Persistência e contexto
1. Ao escolher ou criar uma obra, criar o próximo ambiente disponível, enviar a foto ao bucket privado `obras` e salvar apenas seu caminho/URL assinada, nunca base64 no banco.
2. Vincular a foto à obra e ao ambiente, registrar a imagem na galeria existente e persistir o contexto ativo da IARA.
3. Navegar para a mesma IARA com a obra selecionada e restaurar a foto como anexo pendente, pronta para a próxima mensagem.

## Arquivos e testes
- Isolar o painel e as operações de destino em componentes/serviços pequenos, preservando `ChatInput`, o caminho de render e o histórico atual.
- Ajustar `StudioHub`/IARA apenas para aceitar a troca de contexto produzida pelo novo fluxo.
- Cobrir foto sem projeto, continuar sem cadastro e uso normal da IARA com projeto existente.
- Validar os testes focados e a checagem de tipos disponível no projeto.

## Fora de escopo
- Nenhuma alteração em cobrança, autenticação, políticas, migrações, renderização da IARA ou módulos não relacionados.
