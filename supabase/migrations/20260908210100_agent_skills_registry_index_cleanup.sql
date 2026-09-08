drop index if exists public.agent_skills_registry_status_idx;
drop index if exists public.agent_skills_registry_source_idx;
drop index if exists public.agent_skills_registry_priority_idx;
create index if not exists user_roles_user_id_idx on public.user_roles(user_id);
