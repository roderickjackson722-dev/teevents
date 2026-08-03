CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  score_count INTEGER NOT NULL DEFAULT 0,
  retrieved_at TIMESTAMPTZ,
  retrieved_by UUID,
  reset_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leaderboard_snapshots TO authenticated;
GRANT ALL ON public.leaderboard_snapshots TO service_role;

ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS leaderboard_snapshots_tournament_idx
  ON public.leaderboard_snapshots(tournament_id, created_at DESC);

CREATE POLICY "Organizers and admins can view leaderboard snapshots"
  ON public.leaderboard_snapshots FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = leaderboard_snapshots.tournament_id
        AND public.is_org_admin_or_owner(auth.uid(), t.organization_id)
    )
  );

CREATE POLICY "Organizers and admins can create leaderboard snapshots"
  ON public.leaderboard_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = leaderboard_snapshots.tournament_id
        AND public.is_org_admin_or_owner(auth.uid(), t.organization_id)
    )
  );

CREATE POLICY "Organizers and admins can update leaderboard snapshots"
  ON public.leaderboard_snapshots FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = leaderboard_snapshots.tournament_id
        AND public.is_org_admin_or_owner(auth.uid(), t.organization_id)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = leaderboard_snapshots.tournament_id
        AND public.is_org_admin_or_owner(auth.uid(), t.organization_id)
    )
  );

CREATE TRIGGER update_leaderboard_snapshots_updated_at
  BEFORE UPDATE ON public.leaderboard_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS leaderboard_reset_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leaderboard_last_reset_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS leaderboard_last_reset_by UUID;