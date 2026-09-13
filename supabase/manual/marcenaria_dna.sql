-- Production schema reference for Minha Marcenaria / DNA operacional.
-- The connected production database was already provisioned with this schema.
-- Keep this file as the canonical SQL reference until the repository migration workflow is regenerated.

create table if not exists public.marcenaria_materiais (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, nome text not null, categoria text, unidade text default 'un', espessura numeric, preco numeric, fornecedor text, ativo boolean not null default true, origem text default 'manual', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.marcenaria_fornecedores (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, nome text not null, contato text, site text, observacoes text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.marcenaria_estoque (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, material_id uuid references public.marcenaria_materiais(id) on delete set null, nome_item text not null, quantidade numeric not null default 0, unidade text default 'un', localizacao text, atualizado_em timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table if not exists public.marcenaria_documentos (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, nome text not null, tipo text not null default 'referencia', storage_path text, status text not null default 'recebido', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

alter table public.marcenaria_materiais enable row level security;
alter table public.marcenaria_fornecedores enable row level security;
alter table public.marcenaria_estoque enable row level security;
alter table public.marcenaria_documentos enable row level security;

-- Ownership policies: every record is isolated to auth.uid().
drop policy if exists "owner materials" on public.marcenaria_materiais;
create policy "owner materials" on public.marcenaria_materiais for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "owner suppliers" on public.marcenaria_fornecedores;
create policy "owner suppliers" on public.marcenaria_fornecedores for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "owner stock" on public.marcenaria_estoque;
create policy "owner stock" on public.marcenaria_estoque for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "owner documents" on public.marcenaria_documentos;
create policy "owner documents" on public.marcenaria_documentos for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

grant select, insert, update, delete on public.marcenaria_materiais, public.marcenaria_fornecedores, public.marcenaria_estoque, public.marcenaria_documentos to authenticated;
