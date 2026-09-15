-- Bind asynchronous IARA renders to the persisted execution identity.
ALTER TABLE public.project_iara_contexts
  ADD COLUMN IF NOT EXISTS last_execution_generation BIGINT;

ALTER TABLE public.gallery_images
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.project_environments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES public.project_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS execution_generation BIGINT;

CREATE INDEX IF NOT EXISTS idx_project_iara_contexts_execution_identity
  ON public.project_iara_contexts(user_id, project_id, last_correlation_id, last_execution_generation);

CREATE INDEX IF NOT EXISTS idx_gallery_images_context
  ON public.gallery_images(user_id, project_id, environment_id, version_id, correlation_id);

COMMENT ON COLUMN public.project_iara_contexts.last_execution_generation IS 'Monotonic client execution generation used with last_correlation_id to reject stale async commands.';
COMMENT ON COLUMN public.gallery_images.correlation_id IS 'IARA execution correlation identity for the render that created this image.';
COMMENT ON COLUMN public.gallery_images.execution_generation IS 'IARA execution generation paired with correlation_id for stale-result protection.';
