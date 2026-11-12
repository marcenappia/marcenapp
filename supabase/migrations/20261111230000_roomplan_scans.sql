create table if not exists public.room_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  source text not null default 'roomplan',
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'completed', 'needs_review', 'failed')),
  captured_structure jsonb not null default '{}'::jsonb,
  usdz_storage_path text,
  preview_storage_path text,
  units text not null default 'meters',
  confidence text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_scan_objects (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.room_scans(id) on delete cascade,
  room_index integer not null default 0,
  category text not null,
  width_m numeric,
  height_m numeric,
  depth_m numeric,
  transform jsonb not null default '{}'::jsonb,
  confidence text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists room_scans_user_created_idx on public.room_scans(user_id, created_at desc);
create index if not exists room_scans_project_idx on public.room_scans(project_id, created_at desc);
create index if not exists room_scan_objects_scan_idx on public.room_scan_objects(scan_id, room_index);

alter table public.room_scans enable row level security;
alter table public.room_scan_objects enable row level security;

drop policy if exists room_scans_own on public.room_scans;
create policy room_scans_own on public.room_scans for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists room_scan_objects_own on public.room_scan_objects;
create policy room_scan_objects_own on public.room_scan_objects for all to authenticated
  using (exists (select 1 from public.room_scans s where s.id = scan_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.room_scans s where s.id = scan_id and s.user_id = auth.uid()));

insert into storage.buckets (id, name, public)
values ('room-scans', 'room-scans', false)
on conflict (id) do nothing;

drop policy if exists room_scans_storage_select on storage.objects;
create policy room_scans_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'room-scans' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists room_scans_storage_insert on storage.objects;
create policy room_scans_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'room-scans' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists room_scans_storage_update on storage.objects;
create policy room_scans_storage_update on storage.objects for update to authenticated
  using (bucket_id = 'room-scans' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'room-scans' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists room_scans_storage_delete on storage.objects;
create policy room_scans_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'room-scans' and (storage.foldername(name))[1] = auth.uid()::text);
