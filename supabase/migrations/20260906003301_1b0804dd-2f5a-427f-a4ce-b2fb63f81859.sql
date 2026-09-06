ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS jornada jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS foto_ambiente_path text,
  ADD COLUMN IF NOT EXISTS imagem_apresentacao_path text,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz;

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check CHECK (status IN ('rascunho','aprovado','em_producao','concluido'));

-- Storage: bucket privado "obras", caminho <user_id>/<project_id>/arquivo
CREATE POLICY "Obras: dono lê seus arquivos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'obras' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Obras: dono envia arquivos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'obras' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Obras: dono atualiza arquivos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'obras' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'obras' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Obras: dono apaga arquivos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'obras' AND (storage.foldername(name))[1] = auth.uid()::text);