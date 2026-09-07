CREATE TABLE public.diario_entradas (
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

CREATE INDEX idx_diario_entradas_user_project ON public.diario_entradas (user_id, project_id, created_at DESC);

CREATE TRIGGER update_diario_entradas_updated_at
BEFORE UPDATE ON public.diario_entradas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();