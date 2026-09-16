-- Harden the public project-sharing RPC surface.
-- This migration was reconciled with production migration version 20260916040722.

create table if not exists public.public_share_rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 0
);

revoke all privileges on table public.public_share_rate_limits from public, anon, authenticated;

create or replace function public.consume_public_share_rate_limit(
  p_operation text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_headers jsonb;
  v_ip text;
  v_key text;
  v_now timestamptz := now();
  v_row public.public_share_rate_limits;
begin
  if p_operation is null
     or p_operation not in ('review', 'approve', 'change')
     or p_limit < 1
     or p_window_seconds < 1 then
    return false;
  end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_ip := coalesce(
    nullif(trim(v_headers->>'cf-connecting-ip'), ''),
    nullif(trim(split_part(v_headers->>'x-forwarded-for', ',', 1)), ''),
    'unknown'
  );

  v_key := 'share:' || p_operation || ':' || left(v_ip, 128);

  insert into public.public_share_rate_limits(bucket_key, window_started_at, request_count)
  values(v_key, v_now, 1)
  on conflict (bucket_key) do update
    set request_count = case
      when v_now - public.public_share_rate_limits.window_started_at >= make_interval(secs => p_window_seconds)
        then 1
      else public.public_share_rate_limits.request_count + 1
    end,
    window_started_at = case
      when v_now - public.public_share_rate_limits.window_started_at >= make_interval(secs => p_window_seconds)
        then v_now
      else public.public_share_rate_limits.window_started_at
    end
  returning * into v_row;

  return v_row.request_count <= p_limit;
end;
$function$;

revoke all on function public.consume_public_share_rate_limit(text, integer, integer) from public, anon, authenticated;

create or replace function public.client_review_project(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_share public.project_share_links;
  v_version public.project_versions;
  v_result jsonb;
begin
  if p_token is null or length(p_token) < 32 or length(p_token) > 512 then
    return jsonb_build_object('ok', false, 'error', 'link_invalid_or_expired');
  end if;

  if not public.consume_public_share_rate_limit('review', 60, 60) then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  select * into v_share
  from public.project_share_links
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and revoked_at is null
    and expires_at > now()
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'link_invalid_or_expired');
  end if;

  select * into v_version from public.project_versions where id = v_share.project_version_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'link_invalid_or_expired');
  end if;

  update public.project_share_links set last_accessed_at = now() where id = v_share.id;
  insert into public.project_share_access_logs(share_link_id, action) values(v_share.id, 'view');

  v_result := jsonb_build_object(
    'ok', true,
    'share_link_id', v_share.id,
    'project_id', v_share.project_id,
    'version_id', v_version.id,
    'version_number', v_version.version_number,
    'snapshot', v_version.snapshot,
    'render_path', v_version.render_path,
    'technical_drawing_path', v_version.technical_drawing_path,
    'cut_plan_path', v_version.cut_plan_path,
    'client_budget_summary', v_version.client_budget_summary
  );
  return v_result;
end;
$function$;

create or replace function public.client_approve_project(
  p_token text,
  p_client_name text,
  p_client_email text,
  p_evidence jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_share public.project_share_links;
  v_version public.project_versions;
  v_approval public.project_approvals;
begin
  if p_token is null or length(p_token) < 32 or length(p_token) > 512 then
    return jsonb_build_object('ok', false, 'error', 'link_invalid_or_expired');
  end if;

  if length(coalesce(p_client_name, '')) > 200
     or length(coalesce(p_client_email, '')) > 320
     or pg_column_size(coalesce(p_evidence, '{}'::jsonb)) > 16384 then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;

  if not public.consume_public_share_rate_limit('approve', 10, 60) then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  select * into v_share
  from public.project_share_links
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and revoked_at is null
    and expires_at > now()
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'link_invalid_or_expired');
  end if;

  select * into v_version from public.project_versions where id = v_share.project_version_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'link_invalid_or_expired');
  end if;

  if exists(select 1 from public.project_approvals where project_version_id = v_version.id) then
    return jsonb_build_object('ok', false, 'error', 'version_already_approved');
  end if;

  insert into public.project_approvals(project_id, project_version_id, share_link_id, client_name, client_email, evidence)
  values(v_share.project_id, v_version.id, v_share.id, p_client_name, p_client_email, p_evidence)
  returning * into v_approval;

  update public.project_versions set status = 'approved' where id = v_version.id;
  update public.projects set status = 'aprovado', aprovado_em = now() where id = v_share.project_id;
  insert into public.project_share_access_logs(share_link_id, action, metadata)
  values(v_share.id, 'approve', jsonb_build_object('approval_id', v_approval.id));

  return jsonb_build_object('ok', true, 'approval_id', v_approval.id, 'project_id', v_share.project_id, 'version_id', v_version.id);
end;
$function$;

create or replace function public.client_request_project_change(
  p_token text,
  p_client_name text,
  p_client_email text,
  p_summary text,
  p_message_type text,
  p_body text default null,
  p_audio_path text default null,
  p_transcript text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_share public.project_share_links;
  v_req public.client_change_requests;
begin
  if p_token is null or length(p_token) < 32 or length(p_token) > 512 then
    return jsonb_build_object('ok', false, 'error', 'link_invalid_or_expired');
  end if;

  if p_message_type not in ('text', 'audio') then
    return jsonb_build_object('ok', false, 'error', 'invalid_message_type');
  end if;

  if length(coalesce(p_client_name, '')) > 200
     or length(coalesce(p_client_email, '')) > 320
     or length(coalesce(p_summary, '')) > 2000
     or length(coalesce(p_body, '')) > 10000
     or length(coalesce(p_transcript, '')) > 20000
     or length(coalesce(p_audio_path, '')) > 500 then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;

  if p_message_type = 'audio'
     and (p_audio_path is null or p_audio_path ~* '^(https?:)?//' or p_audio_path like '%..%') then
    return jsonb_build_object('ok', false, 'error', 'invalid_audio_path');
  end if;

  if p_message_type = 'text' and p_audio_path is not null then
    return jsonb_build_object('ok', false, 'error', 'invalid_audio_path');
  end if;

  if not public.consume_public_share_rate_limit('change', 20, 60) then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  select * into v_share
  from public.project_share_links
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and revoked_at is null
    and expires_at > now()
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'link_invalid_or_expired');
  end if;

  insert into public.client_change_requests(project_id, project_version_id, share_link_id, requested_by_name, requested_by_email, summary)
  values(v_share.project_id, v_share.project_version_id, v_share.id, p_client_name, p_client_email, p_summary)
  returning * into v_req;

  insert into public.client_change_request_messages(change_request_id, sender_type, message_type, body, audio_path, transcript)
  values(v_req.id, 'client', p_message_type, p_body, p_audio_path, p_transcript);

  insert into public.project_share_access_logs(share_link_id, action, metadata)
  values(v_share.id, 'request_change', jsonb_build_object('change_request_id', v_req.id));

  return jsonb_build_object('ok', true, 'change_request_id', v_req.id);
end;
$function$;

create or replace function public.create_project_version_and_share(
  p_project_id uuid,
  p_snapshot jsonb,
  p_render_path text,
  p_technical_drawing_path text,
  p_cut_plan_path text,
  p_client_budget_summary jsonb,
  p_token text,
  p_expires_at timestamp with time zone
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_version public.project_versions;
  v_share public.project_share_links;
  v_next integer;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if p_token is null or length(p_token) < 32 or length(p_token) > 512 then raise exception 'invalid_share_token'; end if;
  if p_expires_at is null or p_expires_at <= now() or p_expires_at > now() + interval '30 days' then raise exception 'invalid_share_expiration'; end if;
  if not exists(select 1 from public.projects where id = p_project_id and user_id = v_uid) then raise exception 'project_not_found'; end if;

  select coalesce(max(version_number), 0) + 1 into v_next
  from public.project_versions
  where project_id = p_project_id;

  insert into public.project_versions(project_id, user_id, version_number, status, snapshot, render_path, technical_drawing_path, cut_plan_path, client_budget_summary)
  values(p_project_id, v_uid, v_next, 'shared', coalesce(p_snapshot, '{}'::jsonb), p_render_path, p_technical_drawing_path, p_cut_plan_path, p_client_budget_summary)
  returning * into v_version;

  insert into public.project_share_links(project_id, project_version_id, user_id, token_hash, expires_at)
  values(p_project_id, v_version.id, v_uid, encode(extensions.digest(p_token, 'sha256'), 'hex'), p_expires_at)
  returning * into v_share;

  return jsonb_build_object('ok', true, 'version_id', v_version.id, 'version_number', v_version.version_number, 'share_link_id', v_share.id);
end;
$function$;

revoke all on function public.client_review_project(text) from public, anon, authenticated;
revoke all on function public.client_approve_project(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.client_request_project_change(text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.create_project_version_and_share(uuid, jsonb, text, text, text, jsonb, text, timestamptz) from public, anon, authenticated;

grant execute on function public.client_review_project(text) to anon, authenticated;
grant execute on function public.client_approve_project(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.client_request_project_change(text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.create_project_version_and_share(uuid, jsonb, text, text, text, jsonb, text, timestamptz) to authenticated;
