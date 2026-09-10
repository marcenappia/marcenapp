insert into public.user_roles (user_id, role)
select 'd779a4f5-6723-4fbd-a677-ad033a84572f'::uuid, 'admin'::public.app_role
where exists (select 1 from auth.users where id = 'd779a4f5-6723-4fbd-a677-ad033a84572f'::uuid)
on conflict (user_id, role) do nothing;
