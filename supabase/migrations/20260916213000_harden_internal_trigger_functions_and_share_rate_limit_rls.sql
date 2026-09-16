-- Harden internal trigger-only functions and the internal public-share rate-limit table.
-- Trigger functions do not need Data API EXECUTE privileges; triggers invoke them directly.
-- The rate-limit table is internal state used only by a SECURITY DEFINER helper.

alter table public.public_share_rate_limits enable row level security;
revoke all privileges on table public.public_share_rate_limits from public, anon, authenticated;

revoke all on function public.initialize_project_context_after_insert() from public, anon, authenticated;
revoke all on function public.normalize_project_dimensions_and_initialize_context() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.ensure_gamification_profile() from public, anon, authenticated;
revoke all on function public.create_marcenapp_trial() from public, anon, authenticated;
