-- RLS does not protect TRUNCATE, so end-user roles must never retain it.
-- REFERENCES/TRIGGER are also removed from client roles as unnecessary privilege.

do $$
declare
  r record;
begin
  for r in
    select format('%I.%I', schemaname, tablename) as rel
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'revoke truncate, references, trigger on table %s from anon, authenticated',
      r.rel
    );
  end loop;
end $$;
