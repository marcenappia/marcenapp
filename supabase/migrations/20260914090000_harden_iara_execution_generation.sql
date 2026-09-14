-- IARA execution identity: make correlation + generation update atomic per context scope.
-- Repository-only on this branch; do not apply this migration to production here.

CREATE OR REPLACE FUNCTION public.merge_iara_context(
  p_user_id uuid,
  p_client_id uuid,
  p_project_id uuid,
  p_environment_id uuid,
  p_version_id uuid,
  p_summary text,
  p_decisions jsonb,
  p_artifacts jsonb,
  p_last_correlation_id text,
  p_generation bigint
)
RETURNS public.project_iara_contexts
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  result public.project_iara_contexts;
  scope_hash bigint;
BEGIN
  PERFORM public.validate_iara_context_scope(p_user_id, p_client_id, p_project_id, p_environment_id, p_version_id);
  scope_hash := hashtextextended(concat_ws(':', p_user_id, p_client_id, p_project_id, p_environment_id, p_version_id), 0);
  PERFORM pg_advisory_xact_lock(scope_hash);

  SELECT * INTO result
  FROM public.project_iara_contexts c
  WHERE c.user_id = p_user_id
    AND c.client_id IS NOT DISTINCT FROM p_client_id
    AND c.project_id IS NOT DISTINCT FROM p_project_id
    AND c.environment_id IS NOT DISTINCT FROM p_environment_id
    AND c.version_id IS NOT DISTINCT FROM p_version_id
  FOR UPDATE;

  IF result.id IS NULL THEN
    INSERT INTO public.project_iara_contexts (
      user_id, client_id, project_id, environment_id, version_id,
      summary, decisions, artifacts, last_correlation_id, last_execution_generation
    ) VALUES (
      p_user_id, p_client_id, p_project_id, p_environment_id, p_version_id,
      p_summary,
      CASE WHEN jsonb_typeof(coalesce(p_decisions, '[]'::jsonb)) = 'array' THEN coalesce(p_decisions, '[]'::jsonb) ELSE '[]'::jsonb END,
      CASE WHEN jsonb_typeof(coalesce(p_artifacts, '[]'::jsonb)) = 'array' THEN coalesce(p_artifacts, '[]'::jsonb) ELSE '[]'::jsonb END,
      p_last_correlation_id,
      p_generation
    ) RETURNING * INTO result;
  ELSE
    UPDATE public.project_iara_contexts
    SET
      summary = coalesce(p_summary, result.summary),
      decisions = (
        SELECT coalesce(jsonb_agg(value ORDER BY ord), '[]'::jsonb)
        FROM (
          SELECT value, ord
          FROM jsonb_array_elements(coalesce(result.decisions, '[]'::jsonb) || coalesce(p_decisions, '[]'::jsonb)) WITH ORDINALITY AS elements(value, ord)
          ORDER BY ord DESC LIMIT 50
        ) bounded
      ),
      artifacts = (
        SELECT coalesce(jsonb_agg(value ORDER BY ord), '[]'::jsonb)
        FROM (
          SELECT value, ord
          FROM (
            SELECT value, ord,
              row_number() OVER (PARTITION BY coalesce(value->>'type', ''), coalesce(value->>'id', '') ORDER BY ord DESC) rn
            FROM jsonb_array_elements(coalesce(result.artifacts, '[]'::jsonb) || coalesce(p_artifacts, '[]'::jsonb)) WITH ORDINALITY AS elements(value, ord)
          ) ranked
          WHERE rn = 1
          ORDER BY ord DESC LIMIT 100
        ) bounded
      ),
      last_correlation_id = coalesce(p_last_correlation_id, result.last_correlation_id),
      last_execution_generation = CASE
        WHEN p_generation IS NULL THEN result.last_execution_generation
        WHEN result.last_execution_generation IS NULL THEN p_generation
        ELSE greatest(result.last_execution_generation, p_generation)
      END,
      updated_at = now()
    WHERE id = result.id
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_iara_context(uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,text,bigint) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.merge_iara_context(uuid,uuid,uuid,uuid,uuid,text,jsonb,jsonb,text,bigint) FROM anon;
