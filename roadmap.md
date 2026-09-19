# Roadmap

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
