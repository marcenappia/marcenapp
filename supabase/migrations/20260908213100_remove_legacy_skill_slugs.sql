delete from public.agent_skills_registry
where slug in (
  'github',
  'supabase',
  'supabase-postgres-best-practices',
  'playwright',
  'vitest',
  'vercel-react-best-practices',
  'agent-skill-authoring'
);
