CREATE TABLE public.link_check_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  tournament_title TEXT,
  url TEXT NOT NULL,
  status_code INTEGER,
  resolved_slug TEXT,
  expected_slug TEXT,
  is_error BOOLEAN NOT NULL DEFAULT FALSE,
  skipped BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  run_id UUID,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.link_check_logs TO authenticated;
GRANT ALL ON public.link_check_logs TO service_role;

ALTER TABLE public.link_check_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view link check logs"
ON public.link_check_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_link_check_logs_checked_at ON public.link_check_logs (checked_at DESC);
CREATE INDEX idx_link_check_logs_run ON public.link_check_logs (run_id);