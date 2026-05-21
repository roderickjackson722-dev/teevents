ALTER TABLE public.sponsor_registrations
  ADD COLUMN IF NOT EXISTS is_title_sponsor BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_sponsor_registrations_title
  ON public.sponsor_registrations(tournament_id) WHERE is_title_sponsor = true;