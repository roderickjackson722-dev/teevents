CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  action text NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_rate_limits_ip_action_idx
  ON public.auth_rate_limits (ip_address, action);

GRANT ALL ON public.auth_rate_limits TO service_role;

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- No client policies: only service_role (edge function) may read/write.
CREATE POLICY "Admins can view rate limits"
  ON public.auth_rate_limits FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(_ip text, _action text, _max int, _window_seconds int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.auth_rate_limits;
  retry_after int := 0;
BEGIN
  IF _ip IS NULL OR length(trim(_ip)) = 0 THEN
    RETURN jsonb_build_object('allowed', true, 'attempts', 0);
  END IF;

  SELECT * INTO row FROM public.auth_rate_limits
    WHERE ip_address = _ip AND action = _action FOR UPDATE;

  IF row.id IS NULL THEN
    INSERT INTO public.auth_rate_limits (ip_address, action, attempts, window_start)
      VALUES (_ip, _action, 1, now());
    RETURN jsonb_build_object('allowed', true, 'attempts', 1);
  END IF;

  -- Reset window if expired
  IF row.window_start < now() - make_interval(secs => _window_seconds) THEN
    UPDATE public.auth_rate_limits
      SET attempts = 1, window_start = now(), updated_at = now()
      WHERE id = row.id;
    RETURN jsonb_build_object('allowed', true, 'attempts', 1);
  END IF;

  IF row.attempts >= _max THEN
    retry_after := GREATEST(0, _window_seconds - EXTRACT(EPOCH FROM (now() - row.window_start))::int);
    RETURN jsonb_build_object('allowed', false, 'attempts', row.attempts, 'retry_after', retry_after);
  END IF;

  UPDATE public.auth_rate_limits
    SET attempts = attempts + 1, updated_at = now()
    WHERE id = row.id;
  RETURN jsonb_build_object('allowed', true, 'attempts', row.attempts + 1);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_auth_rate_limit(text, text, int, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_auth_rate_limit(text, text, int, int) TO service_role;