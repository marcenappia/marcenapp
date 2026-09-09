-- MARCENAPP recovery: restore the database contracts already consumed by the app.
-- Non-destructive: creates only missing tables/indexes/policies and preserves existing data.

-- 1) IARA chat history
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender text NOT NULL DEFAULT 'user',
  text text,
  image_url text,
  budget text,
  created_at timestamptz NOT NULL DEFAULT now(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  metadata jsonb
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON public.chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS chat_messages_user_project_idx
  ON public.chat_messages (user_id, project_id, created_at);

-- Keep realtime enabled for the existing chat contract, without duplicating publication membership.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;

-- 2) Diário da Obra entries
CREATE TABLE IF NOT EXISTS public.diario_entradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'nota',
  texto text NOT NULL DEFAULT '',
  foto_path text,
  categoria text,
  evidencia text,
  pendencia_resolvida boolean NOT NULL DEFAULT false,
  importante boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diario_entradas TO authenticated;
GRANT ALL ON public.diario_entradas TO service_role;

ALTER TABLE public.diario_entradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own diario entries"
  ON public.diario_entradas FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_diario_entradas_user_project
  ON public.diario_entradas (user_id, project_id, created_at DESC);

CREATE TRIGGER update_diario_entradas_updated_at
BEFORE UPDATE ON public.diario_entradas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Per-user AI provider preference
CREATE TABLE IF NOT EXISTS public.ai_provider_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'automatic' CHECK (provider IN ('automatic','gemini','lovable')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_provider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own AI provider setting"
  ON public.ai_provider_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_provider_settings TO authenticated;
GRANT ALL ON public.ai_provider_settings TO service_role;

-- 4) IARA orchestrator execution log
-- The application contract only requires user ownership plus JSON plan/results;
-- no additional foreign key is introduced beyond that established contract.
CREATE TABLE IF NOT EXISTS public.orchestrator_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_prompt text NOT NULL,
  plan jsonb,
  results jsonb,
  status text NOT NULL DEFAULT 'planning',
  used_fallback boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orchestrator_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own orchestrator runs"
  ON public.orchestrator_runs FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS orchestrator_runs_user_created_idx
  ON public.orchestrator_runs (user_id, created_at DESC);

CREATE TRIGGER update_orchestrator_runs_updated_at
BEFORE UPDATE ON public.orchestrator_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
