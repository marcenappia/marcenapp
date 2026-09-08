alter table public.agent_skills_registry
  add column if not exists upstream_slug text,
  add column if not exists agent_scope text[] not null default '{}';

update public.agent_skills_registry set
  upstream_slug = case slug
    when 'github' then 'github'
    when 'supabase' then 'supabase'
    when 'supabase-postgres-best-practices' then 'supabase-postgres-best-practices'
    when 'playwright' then 'playwright-interactive'
    when 'vitest' then 'vitest'
    when 'vercel-react-best-practices' then 'vercel-react-best-practices'
    when 'agent-skill-authoring' then 'skill-creator'
    else upstream_slug
  end,
  agent_scope = case slug
    when 'marcenapp-governance' then array['all']
    when 'github' then array['all']
    when 'supabase' then array['all']
    when 'supabase-postgres-best-practices' then array['materials','inventory','production','budget','documents','order']
    when 'playwright' then array['quality','presentation','all']
    when 'vitest' then array['all']
    when 'vercel-react-best-practices' then array['all']
    when 'agent-skill-authoring' then array['all']
    else agent_scope
  end,
  conflict_domains = case slug
    when 'marcenapp-governance' then array[]::text[]
    else conflict_domains
  end,
  notes = case slug
    when 'marcenapp-governance' then 'Governança não é um domínio conflitante; ela define precedência e registra conflitos.'
    else notes
  end,
  last_checked_at = now(), updated_at = now();

insert into public.agent_skills_registry
  (slug,name,source,provider,category,status,priority,version,source_url,install_command,cost_class,estimated_cost_note,capabilities,conflict_domains,agent_scope,notes)
values
('marcenapp-agent-architecture','MARCENAPP Agent Architecture','marcenapp','MARCENAPP','governance','active',100,'1.0.0','https://github.com/marcenappia/marcenap40','local','none','Sem cobrança de serviço por si só.','{agents,dependencies,evidence,blocking}','{agent-instructions,agent-routing}','{all}','Autoridade de domínio para a banca de agentes MARCENAPP.'),
('marcenapp-scene-standards','MARCENAPP Scene Standards','marcenapp','MARCENAPP','visual','active',100,'1.0.0','https://github.com/marcenappia/marcenap40','local','none','Sem cobrança de serviço por si só.','{scene,layout,colors,logo,render,visual-qa}','{visual-design,scene-rendering,visual-qa}','{vision,perspective,multiview,render,quality,presentation}','Preserva cena, layout, cores, logo e composição aprovados.'),
('official-github','GitHub','official','OpenAI','development','active',80,'tracked','https://github.com/openai/plugins','npx skills add openai/plugins --skill github','none','A skill em si não gera cobrança de API.','{repository,issues,pull-requests,ci}','{github-workflow}','{all}','Adapter local; operações reais usam a integração GitHub.'),
('official-supabase','Supabase','official','Supabase','database','active',80,'tracked','https://github.com/supabase/agent-skills','npx skills add supabase/agent-skills --skill supabase','none','A skill em si não gera cobrança; uso do projeto segue o plano/consumo Supabase.','{database,auth,storage,edge-functions,rls}','{database,auth}','{all}','Suporte técnico sem substituir regras de domínio MARCENAPP.'),
('official-supabase-postgres-best-practices','Supabase Postgres Best Practices','official','Supabase','database','active',85,'tracked','https://github.com/supabase/agent-skills','npx skills add supabase/agent-skills --skill supabase-postgres-best-practices','none','A skill em si não gera cobrança; consultas e infraestrutura usam os recursos do projeto.','{postgres,sql,indexes,rls,performance}','{postgres,schema,rls}','{materials,inventory,production,budget,documents,order}','Otimização técnica não substitui regras de negócio.'),
('official-playwright','Playwright Interactive','official','OpenAI','qa','active',80,'tracked','https://github.com/openai/skills','npx skills add openai/skills --skill playwright-interactive','local','Execução local de navegador/testes não é cobrança de IA por si só.','{browser,e2e,visual-qa,debugging}','{e2e,visual-qa}','{quality,presentation,all}','Verifica comportamento; não redefine cena aprovada.'),
('official-vitest','Vitest','official','Supabase','qa','active',75,'tracked','https://github.com/supabase/agent-skills','npx skills add supabase/agent-skills --skill vitest','local','Execução local de testes não é cobrança de IA por si só.','{unit-tests,mocks,coverage}','{testing}','{all}','Usar o framework de testes existente.'),
('official-vercel-react-best-practices','Vercel React Best Practices','official','Vercel','frontend','active',70,'tracked','https://github.com/vercel-labs/agent-skills','npx skills add vercel-labs/agent-skills --skill react-best-practices','none','A skill em si não gera cobrança; serviços Vercel seguem o plano/uso.','{react,performance,refactoring,frontend}','{react,performance}','{all}','Somente orientação técnica; não altera domínio ou visual aprovado.'),
('official-agent-skill-authoring','Agent Skill Authoring','official','Supabase','governance','active',65,'tracked','https://github.com/supabase/agent-skills','npx skills add supabase/agent-skills --skill skill-creator','none','A skill em si não gera cobrança.','{skill-authoring,skill-structure,progressive-disclosure}','{skills,agent-instructions}','{all}','Usar para criar skills próprios sem duplicação.')
on conflict (slug) do update set
  name=excluded.name, source=excluded.source, provider=excluded.provider, category=excluded.category,
  status=excluded.status, priority=excluded.priority, version=excluded.version, source_url=excluded.source_url,
  install_command=excluded.install_command, cost_class=excluded.cost_class, estimated_cost_note=excluded.estimated_cost_note,
  capabilities=excluded.capabilities, conflict_domains=excluded.conflict_domains, agent_scope=excluded.agent_scope,
  notes=excluded.notes, upstream_slug=excluded.upstream_slug, last_checked_at=now(), updated_at=now();