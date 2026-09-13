-- Canonical SQL reference for Minha Marcenaria / DNA operacional.
-- Runtime dependencies are represented here and reproducible from migrations.

create table if not exists public.marcenaria_dna (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marcenaria_dna_user_unique unique (user_id)
);
create index if not exists marcenaria_dna_user_idx on public.marcenaria_dna(user_id);

create table if not exists public.marcenaria_materiais (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, nome text not null, categoria text, unidade text default 'un', espessura numeric, preco numeric, fornecedor text, ativo boolean not null default true, origem text default 'manual', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.marcenaria_fornecedores (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, nome text not null, contato text, site text, observacoes text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.marcenaria_estoque (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, material_id uuid references public.marcenaria_materiais(id) on delete set null, nome_item text not null, quantidade numeric not null default 0, unidade text default 'un', localizacao text, atualizado_em timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table if not exists public.marcenaria_documentos (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, nome text not null, tipo text not null default 'referencia', storage_path text, status text not null default 'recebido', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

alter table public.marcenaria_dna enable row level security;
alter table public.marcenaria_materiais enable row level security;
alter table public.marcenaria_fornecedores enable row level security;
alter table public.marcenaria_estoque enable row level security;
alter table public.marcenaria_documentos enable row level security;

drop policy if exists "owner dna" on public.marcenaria_dna;
create policy "owner dna" on public.marcenaria_dna for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "owner materials" on public.marcenaria_materiais;
create policy "owner materials" on public.marcenaria_materiais for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "owner suppliers" on public.marcenaria_fornecedores;
create policy "owner suppliers" on public.marcenaria_fornecedores for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "owner stock" on public.marcenaria_estoque;
create policy "owner stock" on public.marcenaria_estoque for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "owner documents" on public.marcenaria_documentos;
create policy "owner documents" on public.marcenaria_documentos for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

grant select, insert, update, delete on public.marcenaria_dna, public.marcenaria_materiais, public.marcenaria_fornecedores, public.marcenaria_estoque, public.marcenaria_documentos to authenticated;

-- The private obras bucket accepts only formats consumed by dnaIngestion.ts and remains capped at 10 MB.
update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf','text/csv','text/plain','image/jpeg','image/png','image/webp']::text[]
where id = 'obras';
