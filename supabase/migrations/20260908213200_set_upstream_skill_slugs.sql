update public.agent_skills_registry set upstream_slug = case slug
  when 'official-github' then 'github'
  when 'official-supabase' then 'supabase'
  when 'official-supabase-postgres-best-practices' then 'supabase-postgres-best-practices'
  when 'official-playwright' then 'playwright-interactive'
  when 'official-vitest' then 'vitest'
  when 'official-vercel-react-best-practices' then 'react-best-practices'
  when 'official-agent-skill-authoring' then 'skill-creator'
  else upstream_slug end,
  last_checked_at = now(), updated_at = now();
