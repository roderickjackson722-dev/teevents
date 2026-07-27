ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS flights_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flight_method TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS flight_based_on TEXT NOT NULL DEFAULT 'score',
  ADD COLUMN IF NOT EXISTS shootout_rounds JSONB;

ALTER TABLE public.golf_leagues
  ADD COLUMN IF NOT EXISTS flights_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flight_method TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS flight_based_on TEXT NOT NULL DEFAULT 'score';

ALTER TABLE public.league_events
  ADD COLUMN IF NOT EXISTS flights_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flight_method TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS flight_based_on TEXT NOT NULL DEFAULT 'score';

ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS team_handicap NUMERIC,
  ADD COLUMN IF NOT EXISTS team_handicap_percentage NUMERIC(5,2);

CREATE TABLE IF NOT EXISTS public.flight_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  league_id UUID REFERENCES public.golf_leagues(id) ON DELETE CASCADE,
  league_event_id UUID REFERENCES public.league_events(id) ON DELETE CASCADE,
  flight_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  player_count INTEGER NOT NULL DEFAULT 0,
  total_purse_cents INTEGER NOT NULL DEFAULT 0,
  first_place_cents INTEGER NOT NULL DEFAULT 0,
  second_place_cents INTEGER NOT NULL DEFAULT 0,
  third_place_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT flight_payouts_scope_chk CHECK (tournament_id IS NOT NULL OR league_id IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flight_payouts TO authenticated;
GRANT ALL ON public.flight_payouts TO service_role;

ALTER TABLE public.flight_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage flight payouts"
ON public.flight_payouts
FOR ALL
TO authenticated
USING (
  (tournament_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = flight_payouts.tournament_id
      AND (public.is_org_member(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))
  ))
  OR (league_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.golf_leagues l
    WHERE l.id = flight_payouts.league_id
      AND (public.is_org_member(auth.uid(), l.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))
  ))
)
WITH CHECK (
  (tournament_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = flight_payouts.tournament_id
      AND (public.is_org_member(auth.uid(), t.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))
  ))
  OR (league_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.golf_leagues l
    WHERE l.id = flight_payouts.league_id
      AND (public.is_org_member(auth.uid(), l.organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))
  ))
);

CREATE INDEX IF NOT EXISTS flight_payouts_tournament_idx ON public.flight_payouts(tournament_id);
CREATE INDEX IF NOT EXISTS flight_payouts_league_idx ON public.flight_payouts(league_id);

CREATE TRIGGER update_flight_payouts_updated_at
BEFORE UPDATE ON public.flight_payouts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();