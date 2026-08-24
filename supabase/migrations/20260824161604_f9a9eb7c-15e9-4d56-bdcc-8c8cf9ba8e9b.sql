-- Indexes for large-event leaderboard pagination and round filtering
CREATE INDEX IF NOT EXISTS idx_tournament_scores_tid_reg_round_hole
  ON public.tournament_scores (tournament_id, registration_id, round_number, hole_number);

CREATE INDEX IF NOT EXISTS idx_tournament_scores_tid_round_reg_hole
  ON public.tournament_scores (tournament_id, round_number, registration_id, hole_number);

CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tid_id
  ON public.tournament_registrations (tournament_id, id);

CREATE INDEX IF NOT EXISTS idx_league_event_scores_event_member_hole
  ON public.league_event_scores (event_id, member_id, hole_number);

-- Performance / latency telemetry for leaderboard reads and writes
CREATE TABLE IF NOT EXISTS public.leaderboard_performance_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid,
  league_event_id uuid,
  user_id uuid,
  operation text NOT NULL,
  duration_ms integer NOT NULL DEFAULT 0,
  row_count integer NOT NULL DEFAULT 0,
  page_count integer NOT NULL DEFAULT 0,
  retry_count integer NOT NULL DEFAULT 0,
  round_number integer,
  ok boolean NOT NULL DEFAULT true,
  error_message text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.leaderboard_performance_log TO authenticated;
GRANT ALL ON public.leaderboard_performance_log TO service_role;

ALTER TABLE public.leaderboard_performance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log their own leaderboard metrics"
  ON public.leaderboard_performance_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own leaderboard metrics"
  ON public.leaderboard_performance_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all leaderboard metrics"
  ON public.leaderboard_performance_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_leaderboard_perf_log_created
  ON public.leaderboard_performance_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_perf_log_tournament
  ON public.leaderboard_performance_log (tournament_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_perf_log_slow
  ON public.leaderboard_performance_log (operation, duration_ms DESC);

CREATE OR REPLACE FUNCTION public.purge_old_leaderboard_performance_log()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted integer;
BEGIN
  DELETE FROM public.leaderboard_performance_log
  WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;