CREATE TABLE public.ai_rate_limits (
  user_id uuid NOT NULL,
  fn text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, fn)
);
GRANT ALL ON public.ai_rate_limits TO service_role;
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;
-- Sem policies: nenhum acesso via API para anon/authenticated; apenas service_role (bypassa RLS).

CREATE OR REPLACE FUNCTION public.consume_ai_rate_limit(
  _user_id uuid,
  _fn text,
  _limit integer,
  _window_seconds integer
)
RETURNS TABLE (allowed boolean, remaining integer, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_row public.ai_rate_limits%ROWTYPE;
  v_window_end timestamptz;
BEGIN
  INSERT INTO public.ai_rate_limits (user_id, fn, window_start, count)
  VALUES (_user_id, _fn, v_now, 0)
  ON CONFLICT (user_id, fn) DO NOTHING;

  SELECT * INTO v_row FROM public.ai_rate_limits
   WHERE user_id = _user_id AND fn = _fn FOR UPDATE;

  IF v_row.window_start + make_interval(secs => _window_seconds) <= v_now THEN
    v_row.window_start := v_now;
    v_row.count := 0;
  END IF;

  v_window_end := v_row.window_start + make_interval(secs => _window_seconds);

  IF v_row.count >= _limit THEN
    UPDATE public.ai_rate_limits SET window_start = v_row.window_start, count = v_row.count
     WHERE user_id = _user_id AND fn = _fn;
    RETURN QUERY SELECT false, 0, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_window_end - v_now)))::integer);
    RETURN;
  END IF;

  v_row.count := v_row.count + 1;
  UPDATE public.ai_rate_limits SET window_start = v_row.window_start, count = v_row.count
   WHERE user_id = _user_id AND fn = _fn;

  RETURN QUERY SELECT true, (_limit - v_row.count), 0;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_rate_limit(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_rate_limit(uuid, text, integer, integer) TO service_role;