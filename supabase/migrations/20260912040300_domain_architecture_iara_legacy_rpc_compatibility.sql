create or replace function public.merge_iara_project_context(p_user_id uuid,p_project_id uuid,p_summary text,p_decisions jsonb,p_artifacts jsonb,p_last_correlation_id text)
returns public.project_iara_contexts language plpgsql security invoker set search_path=public as $$
begin
  return public.merge_iara_context(p_user_id,null,p_project_id,null,null,p_summary,p_decisions,p_artifacts,p_last_correlation_id);
end; $$;
revoke all on function public.merge_iara_project_context(uuid,uuid,text,jsonb,jsonb,text) from public;
grant execute on function public.merge_iara_project_context(uuid,uuid,text,jsonb,jsonb,text) to authenticated;
