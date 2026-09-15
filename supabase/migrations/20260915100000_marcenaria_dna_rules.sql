create table if not exists public.marcenaria_dna_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('identidade','construcao','materiais','ferragens','medidas','producao','orcamento','comunicacao','qualidade','preferencia')),
  rule_key text not null,
  rule_value jsonb not null default '{}'::jsonb,
  status text not null default 'defined' check (status in ('defined','learned','suggested','project_exception')),
  source text not null default 'manual' check (source in ('manual','observed','project','system')),
  confidence numeric not null default 1 check (confidence >= 0 and confidence <= 1),
  version integer not null default 1 check (version > 0),
  effective_from timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marcenaria_dna_rules_user_status_idx on public.marcenaria_dna_rules(user_id,status,category,updated_at desc);
create index if not exists marcenaria_dna_rules_user_key_idx on public.marcenaria_dna_rules(user_id,category,rule_key,version desc);

alter table public.marcenaria_dna_rules enable row level security;

drop policy if exists marcenaria_dna_rules_select_own on public.marcenaria_dna_rules;
drop policy if exists marcenaria_dna_rules_insert_own on public.marcenaria_dna_rules;
drop policy if exists marcenaria_dna_rules_update_own on public.marcenaria_dna_rules;
drop policy if exists marcenaria_dna_rules_delete_own on public.marcenaria_dna_rules;
create policy marcenaria_dna_rules_select_own on public.marcenaria_dna_rules for select to authenticated using (user_id = auth.uid());
create policy marcenaria_dna_rules_insert_own on public.marcenaria_dna_rules for insert to authenticated with check (user_id = auth.uid() and (created_by is null or created_by = auth.uid()));
create policy marcenaria_dna_rules_update_own on public.marcenaria_dna_rules for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and (created_by is null or created_by = auth.uid()));
create policy marcenaria_dna_rules_delete_own on public.marcenaria_dna_rules for delete to authenticated using (user_id = auth.uid());
