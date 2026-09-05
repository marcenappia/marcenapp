ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

CREATE INDEX IF NOT EXISTS chat_messages_user_project_idx
  ON public.chat_messages (user_id, project_id, created_at);