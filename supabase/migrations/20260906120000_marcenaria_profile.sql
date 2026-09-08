-- Perfil profissional da marcenaria: dados fiscais + presença pública opcional.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cnpj TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cpf TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS trade_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS state TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS website_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS other_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS specialties TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS public_slug TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_public_slug_unique
  ON public.profiles(public_slug)
  WHERE public_slug IS NOT NULL AND public_slug <> '';

-- O perfil completo continua privado por padrão. Quando o marceneiro ativa o compartilhamento,
-- a página pública consegue ler somente o registro marcado como público; a UI nunca exibe CPF/CNPJ.
DROP POLICY IF EXISTS "Public can view shared profiles" ON public.profiles;
CREATE POLICY "Public can view shared profiles"
  ON public.profiles FOR SELECT
  USING (is_public = true AND public_slug IS NOT NULL AND public_slug <> '');

COMMENT ON COLUMN public.profiles.cnpj IS 'CNPJ da marcenaria; obrigatório para concluir o cadastro profissional.';
COMMENT ON COLUMN public.profiles.cpf IS 'CPF do responsável, opcional.';
COMMENT ON COLUMN public.profiles.is_public IS 'Permite compartilhar uma vitrine pública da marcenaria sem expor documentos fiscais.';
