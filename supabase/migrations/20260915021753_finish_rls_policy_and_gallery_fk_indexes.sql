-- Final production advisor cleanup for RLS policy shape and gallery foreign-key indexes.
DROP POLICY IF EXISTS "agent registry writable by admins" ON public.agent_registry;
CREATE POLICY "agent registry writable by admins" ON public.agent_registry
  FOR INSERT TO authenticated
  WITH CHECK ((select public.is_admin_user((select auth.uid()))));
CREATE POLICY "agent registry writable by admins update" ON public.agent_registry
  FOR UPDATE TO authenticated
  USING ((select public.is_admin_user((select auth.uid()))))
  WITH CHECK ((select public.is_admin_user((select auth.uid()))));
CREATE POLICY "agent registry writable by admins delete" ON public.agent_registry
  FOR DELETE TO authenticated
  USING ((select public.is_admin_user((select auth.uid()))));

CREATE INDEX IF NOT EXISTS idx_gallery_images_project_id ON public.gallery_images(project_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_environment_id ON public.gallery_images(environment_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_version_id ON public.gallery_images(version_id);
