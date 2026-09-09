-- Trigger functions do not need client EXECUTE privileges.
revoke execute on function public.update_updated_at_column() from public, anon, authenticated;
