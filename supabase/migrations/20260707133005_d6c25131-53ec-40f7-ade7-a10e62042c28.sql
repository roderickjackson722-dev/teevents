
ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS flight_id UUID REFERENCES public.tournament_tiers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tournament_registrations_flight ON public.tournament_registrations(flight_id);
