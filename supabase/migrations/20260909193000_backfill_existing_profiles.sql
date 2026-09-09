insert into public.profiles (user_id, name)
select id, coalesce(raw_user_meta_data->>'name', '')
from auth.users
on conflict (user_id) do nothing;
