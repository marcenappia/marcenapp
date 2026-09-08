-- Storage usado pela jornada "Novo Projeto".
-- O código já grava fotos em storage.objects no bucket privado `obras`;
-- esta migration garante que o bucket exista antes do primeiro upload.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'obras',
  'obras',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
