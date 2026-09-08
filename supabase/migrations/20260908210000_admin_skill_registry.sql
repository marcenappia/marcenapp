do $$ begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'app_role') then
    create type public.app_role as enum ('admin','owner','editor','viewer');
  end if;
end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;
revoke all on table public.user_roles from anon, authenticated;
grant select on table public.user_roles to authenticated;
drop policy if exists "users can read own roles" on public.user_roles;
create policy "users can read own roles" on public.user_roles
  for select to authenticated
  using ((select auth.uid()) = user_id);
create index if not exists user_roles_user_id_idx on public.user_roles(user_id);

create schema if not exists private;
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'::public.app_role
  );
$$;
revoke execute on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create table if not exists public.agent_skills_registry (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  source text not null check (source in ('marcenapp','official','community')),
  provider text,
  category text not null,
  status text not null default 'active' check (status in ('active','disabled','review','conflict')),
  priority integer not null default 50 check (priority between 0 and 100),
  version text,
  source_url text,
  install_command text,
  cost_class text not null default 'none' check (cost_class in ('none','local','external_usage','paid_service')),
  external_service text,
  estimated_cost_note text,
  capabilities text[] not null default '{}',
  conflict_domains text[] not null default '{}',
  notes text,
  installed_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agent_skills_registry enable row level security;
revoke all on table public.agent_skills_registry from anon, authenticated;
grant select, insert, update, delete on table public.agent_skills_registry to authenticated;
drop policy if exists "admins can read agent skills" on public.agent_skills_registry;
drop policy if exists "admins can insert agent skills" on public.agent_skills_registry;
drop policy if exists "admins can update agent skills" on public.agent_skills_registry;
drop policy if exists "admins can delete agent skills" on public.agent_skills_registry;
create policy "admins can read agent skills" on public.agent_skills_registry for select to authenticated using ((select private.is_admin()));
create policy "admins can insert agent skills" on public.agent_skills_registry for insert to authenticated with check ((select private.is_admin()));
create policy "admins can update agent skills" on public.agent_skills_registry for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins can delete agent skills" on public.agent_skills_registry for delete to authenticated using ((select private.is_admin()));

insert into public.agent_skills_registry (slug,name,source,provider,category,status,priority,version,source_url,install_command,cost_class,external_service,estimated_cost_note,capabilities,conflict_domains,notes)
values
('marcenapp-governance','MARCENAPP Skill Governance','marcenapp','MARCENAPP','governance','active',100,'1.0.0','https://github.com/marcenappia/marcenap40','local','none',null,'Sem cobrança de serviço por si só; apenas instruções e registro.','{governance,conflict-prevention,cost-tracking,admin}','{all}','Skills próprios MARCENAPP têm prioridade sobre skills externos em domínios iguais.'),
('github','GitHub','official','OpenAI','development','active',80,'tracked','https://github.com/openai/plugins','npx skills add https://github.com/openai/plugins --skill github','none',null,'A skill em si não gera cobrança de API; ações podem consumir serviços externos se configurados.','{repository,issues,pull-requests,ci}','{github-workflow}','Skill de orientação; o conector GitHub continua sendo a integração operacional.'),
('supabase','Supabase','official','Supabase','database','active',80,'tracked','https://github.com/supabase/agent-skills','npx skills add https://github.com/supabase/agent-skills --skill supabase','none',null,'A skill em si não gera cobrança; uso do projeto Supabase segue o plano/consumo da conta.','{database,auth,storage,edge-functions,rls}','{database,auth}','Verificar documentação atual antes de mudanças.'),
('supabase-postgres-best-practices','Supabase Postgres Best Practices','official','Supabase','database','active',85,'tracked','https://github.com/supabase/agent-skills','npx skills add https://github.com/supabase/agent-skills --skill supabase-postgres-best-practices','none',null,'A skill em si não gera cobrança; consultas e infraestrutura usam os recursos do projeto.','{postgres,sql,indexes,rls,performance}','{postgres,schema,rls}','Prioridade alta para SQL, schema e RLS.'),
('playwright','Playwright','official','OpenAI','qa','active',80,'tracked','https://github.com/openai/skills','npx skills add https://github.com/openai/skills --skill playwright','local',null,'Execução local de navegador/testes não é cobrança de IA por si só.','{browser,e2e,visual-qa,debugging}','{e2e,visual-qa}','Preservar padrões visuais aprovados do MARCENAPP.'),
('vitest','Vitest','official','Supabase','qa','active',75,'tracked','https://github.com/supabase/agent-skills','npx skills add https://github.com/supabase/supabase --skill vitest','local',null,'Execução local de testes não é cobrança de IA por si só.','{unit-tests,mocks,coverage}','{testing}','O projeto já possui Vitest configurado.'),
('vercel-react-best-practices','Vercel React Best Practices','official','Vercel','frontend','active',70,'tracked','https://github.com/vercel-labs/agent-skills','npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices','none',null,'A skill em si não gera cobrança; deploy/observabilidade Vercel seguem o plano/uso.','{react,performance,refactoring,frontend}','{react,performance}','Não autoriza mudanças visuais que contrariem o padrão MARCENAPP.'),
('agent-skill-authoring','Agent Skill Authoring','official','Supabase','governance','active',65,'tracked','https://github.com/supabase/agent-skills','npx skills add https://github.com/supabase/agent-skills --skill skill-creator','none',null,'A skill em si não gera cobrança.','{skill-authoring,skill-structure,progressive-disclosure}','{skills,agent-instructions}','Usar para criar novos skills próprios sem duplicar skills externos.')
on conflict (slug) do update set name=excluded.name, source=excluded.source, provider=excluded.provider, category=excluded.category, status=excluded.status, priority=excluded.priority, version=excluded.version, source_url=excluded.source_url, install_command=excluded.install_command, cost_class=excluded.cost_class, external_service=excluded.external_service, estimated_cost_note=excluded.estimated_cost_note, capabilities=excluded.capabilities, conflict_domains=excluded.conflict_domains, notes=excluded.notes, last_checked_at=now(), updated_at=now();