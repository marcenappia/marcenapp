CREATE TABLE IF NOT EXISTS public.project_iara_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  environment_id UUID,
  version_id UUID,
  last_correlation_id TEXT,
  last_execution_generation BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_iara_contexts TO authenticated;
GRANT ALL ON public.project_iara_contexts TO service_role;
ALTER TABLE public.project_iara_contexts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own IARA contexts" ON public.project_iara_contexts FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own IARA contexts" ON public.project_iara_contexts FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own IARA contexts" ON public.project_iara_contexts FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own IARA contexts" ON public.project_iara_contexts FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

ALTER TABLE public.gallery_images
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS environment_id UUID,
  ADD COLUMN IF NOT EXISTS version_id UUID,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS execution_generation BIGINT;
GRANT SELECT, INSERT, DELETE ON public.gallery_images TO authenticated;
GRANT ALL ON public.gallery_images TO service_role;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS environment_id UUID,
  ADD COLUMN IF NOT EXISTS version_id UUID;
GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;

CREATE INDEX IF NOT EXISTS idx_project_iara_contexts_execution_identity ON public.project_iara_contexts(user_id, project_id, last_correlation_id, last_execution_generation);
CREATE INDEX IF NOT EXISTS idx_gallery_images_context ON public.gallery_images(user_id, project_id, environment_id, version_id, correlation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_render_correlation ON public.chat_messages(user_id, project_id, environment_id, version_id, ((metadata ->> 'correlationId')));

COMMENT ON COLUMN public.project_iara_contexts.last_execution_generation IS 'Execution generation paired with last_correlation_id to reject stale asynchronous commands.';
COMMENT ON COLUMN public.gallery_images.correlation_id IS 'IARA execution correlation identity for the render that created this image.';
COMMENT ON COLUMN public.gallery_images.execution_generation IS 'IARA execution generation paired with correlation_id for stale-result protection.';