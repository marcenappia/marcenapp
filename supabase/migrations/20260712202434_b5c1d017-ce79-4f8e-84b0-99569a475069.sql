
-- has_role: usada em RLS e UI — apenas autenticados
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

-- assign_default_role: apenas trigger — ninguém deve chamar diretamente
REVOKE EXECUTE ON FUNCTION public.assign_default_role() FROM PUBLIC, anon, authenticated;
