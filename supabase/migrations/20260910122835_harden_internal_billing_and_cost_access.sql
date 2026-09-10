-- Harden internal billing/cost surfaces.
-- These tables and RPCs are server-side only; frontend access goes through
-- authenticated, authorization-checked RPCs or Edge Functions using service role.
REVOKE ALL ON TABLE public.admin_cost_rates FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_billing_credit(uuid, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_billing_credit(uuid, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_billing_credits(uuid, text, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_billing_payment(text, text, boolean) FROM anon, authenticated;
