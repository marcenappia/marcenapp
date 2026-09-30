-- Allow Vercel AI Gateway as a selectable provider while preserving the existing automatic/Lovable/Gemini modes.
alter table public.ai_provider_settings drop constraint if exists ai_provider_settings_provider_check;
alter table public.ai_provider_settings
  add constraint ai_provider_settings_provider_check
  check (provider = any (array['automatic'::text, 'lovable'::text, 'vercel'::text, 'gemini'::text]));
