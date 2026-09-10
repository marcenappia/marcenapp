revoke execute on function public.is_admin_user(uuid) from anon;
revoke execute on function public.admin_list_billing_credit_rules() from anon;
revoke execute on function public.admin_upsert_billing_credit_rule(text,text,integer,boolean,integer,boolean) from anon;
grant execute on function public.is_admin_user(uuid) to authenticated, service_role;
grant execute on function public.admin_list_billing_credit_rules() to authenticated, service_role;
grant execute on function public.admin_upsert_billing_credit_rule(text,text,integer,boolean,integer,boolean) to authenticated, service_role;
