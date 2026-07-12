
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own clientes" ON public.clientes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link projects to clientes (optional FK)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS nome TEXT;

-- Orchestrator run log for observability (IARA OS v1)
CREATE TABLE public.orchestrator_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_prompt TEXT NOT NULL,
  plan JSONB,
  results JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  used_fallback BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orchestrator_runs TO authenticated;
GRANT ALL ON public.orchestrator_runs TO service_role;

ALTER TABLE public.orchestrator_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own orchestrator runs" ON public.orchestrator_runs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_orchestrator_runs_updated_at
  BEFORE UPDATE ON public.orchestrator_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
