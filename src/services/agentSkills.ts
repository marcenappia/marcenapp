import { supabase } from '@/integrations/supabase/client';

export type AgentSkill = {
  id: string;
  slug: string;
  upstream_slug: string | null;
  name: string;
  source: 'marcenapp' | 'official' | 'community';
  provider: string | null;
  category: string;
  status: 'active' | 'disabled' | 'review' | 'conflict';
  priority: number;
  version: string | null;
  source_url: string | null;
  install_command: string | null;
  cost_class: 'none' | 'local' | 'external_usage' | 'paid_service';
  external_service: string | null;
  estimated_cost_note: string | null;
  capabilities: string[];
  conflict_domains: string[];
  agent_scope: string[];
  notes: string | null;
  installed_at: string;
  last_checked_at: string;
  updated_at: string;
};

export async function getAgentSkills(): Promise<AgentSkill[]> {
  const db = supabase as any;
  const { data, error } = await db
    .from('agent_skills_registry')
    .select('*')
    .order('priority', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AgentSkill[];
}
