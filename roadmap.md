# Roadmap

## Erros da versão de teste — escopo atual
- [ ] Corrigir imports, contratos de tipos e testes incompatíveis com a implementação atual
- [ ] Executar os testes relacionados e conferir a verificação automática

## Auditoria P0 do render — escopo atual
- [ ] Corrigir perda de imagem, mapeamento de erros e execução da fila sem mudar layout
- [ ] Executar testes focados e verificar os erros da versão em teste
- [ ] Verificar geração real (bloqueada se funções de cobrança/contexto estiverem ausentes no banco conectado)

## Fase 0 (bloqueadores) — concluída
- [x] JWT nas 3 Edge Functions; cliente envia token da sessão
- [x] Rate limit por usuário
- [x] CORS restrito; Zod + cap de body em ai-text; erros genéricos
- [x] Vitest sem OOM

## Jornada guiada (marceneiro-first) — etapa 1
- [x] Revisão objetiva UX/arquitetura da jornada atual (home, nav, projetos, Studio, onboarding)
- [x] Nova Home simples: "Novo Projeto" como ação principal + lista de projetos com progresso
- [x] Fluxo "Novo Projeto" guiado por etapas (nome/cliente → foto → pedido do cliente → IARA analisa → apresentação)
- [x] Reaproveitar IARA/Studio/Gemini existentes (sem recriar)
- [x] Verificação de tipos/build

Fases 1–3 técnicas: ver `.lovable/plan/auditoria-técnica-completa-marcenapp-os-2026-09-05.md`

## Jornada — etapa 2 (próximo)
- [ ] Persistir etapa/aprovação da obra no banco (hoje: localStorage)
- [ ] Guardar foto do ambiente em Storage para retomar a obra
- [ ] Produção: lista de peças + ferragens + plano de corte a partir da obra aprovada
- [ ] Exportar/compartilhar PDF (apresentação, orçamento, contrato)

## IARA render end-to-end — em validação
- [x] Alinhar contexto persistente de execução e galeria no backend conectado
- [x] Atualizar `ai-image` para o contrato atual do Lovable AI Gateway
- [x] Recuperar conclusões assíncronas após remontagem/reload e publicar uma única mensagem final
- [ ] Validar testes, qualidade, deploy e uma geração real com evidências
- [x] Não perder imagem válida quando a persistência de galeria/contexto falhar

## Gerações IARA, cobrança e publicação real — em andamento
- [ ] Publicar a tela de saldo de créditos com histórico real de gerações
- [ ] Remover qualquer exceção temporária e validar débito/restante real de créditos
- [ ] Criar e configurar `migrate-helper` com acesso público controlado para migração
- [ ] Atualizar todas as funções de IA para o catálogo atual da Lovable
- [ ] Validar e publicar cada função alterada
- [ ] Executar geração completa pela IARA até imagem aparecer no chat
- [ ] Confirmar a mesma imagem e `resultUrl` visíveis no Studio com logs de cada etapa

## IARA — foto primeiro, destino depois
- [ ] Liberar câmera e anexos no estado compacto sem projeto
- [ ] Escolher/criar cliente, obra e ambiente após capturar a foto
- [ ] Persistir a foto no Storage, galeria e contexto ativo sem base64 no banco
- [ ] Preservar o anexo ao navegar e cobrir o fluxo com testes focados
