ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS reduce_motion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_onboarding_step_nonnegative;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_onboarding_step_nonnegative
  CHECK (onboarding_step >= 0);
