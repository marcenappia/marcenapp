-- Follow-up to P1 security hardening: remove the pre-existing explicit anonymous
-- EXECUTE grant from gamification. REVOKE PUBLIC does not remove a direct role grant.
revoke execute on function public.register_gamification_activity(uuid,integer) from anon;
grant execute on function public.register_gamification_activity(uuid,integer) to authenticated, service_role;
