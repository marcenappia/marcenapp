-- Hardens plan-suggestion confirmation against duplicate environments.
-- The suggestion row is locked and confirmation is idempotent.

create or replace function public.confirm_project_plan_environment_suggestion(p_suggestion_id uuid, p_name text default null)
returns public.project_environments
language plpgsql
security invoker
set search_path=public
as $$
declare
  suggestion public.project_plan_environment_suggestions;
  environment public.project_environments;
  final_name text;
begin
  select * into suggestion
  from public.project_plan_environment_suggestions
  where id = p_suggestion_id
    and exists (
      select 1 from public.projects p
      where p.id = project_plan_environment_suggestions.project_id
        and p.user_id = auth.uid()
    )
  for update;

  if not found then
    raise exception 'Suggestion not found or unauthorized';
  end if;

  final_name := nullif(trim(coalesce(p_name, suggestion.name)), '');
  if final_name is null then
    raise exception 'Environment name is required';
  end if;

  if suggestion.status = 'rejected' then
    raise exception 'Esta sugestão de ambiente foi rejeitada.';
  end if;

  if suggestion.confirmed_environment_id is not null then
    select * into environment
    from public.project_environments
    where id = suggestion.confirmed_environment_id
      and project_id = suggestion.project_id
    for update;

    if not found then
      raise exception 'Confirmed environment not found';
    end if;

    if environment.name <> final_name then
      update public.project_environments
      set name = final_name, updated_at = now()
      where id = environment.id
      returning * into environment;
      update public.project_plan_environment_suggestions
      set status = 'renamed', name = final_name, updated_at = now()
      where id = suggestion.id;
    else
      update public.project_plan_environment_suggestions
      set status = 'confirmed', updated_at = now()
      where id = suggestion.id;
    end if;

    return environment;
  end if;

  insert into public.project_environments(project_id, name, type, position)
  values (suggestion.project_id, final_name, suggestion.type, suggestion.position)
  returning * into environment;

  update public.project_plan_environment_suggestions
  set status = case when final_name <> suggestion.name then 'renamed' else 'confirmed' end,
      name = final_name,
      confirmed_environment_id = environment.id,
      updated_at = now()
  where id = suggestion.id;

  return environment;
end;
$$;

grant execute on function public.confirm_project_plan_environment_suggestion(uuid,text) to authenticated;
