ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS show_countdown BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tournaments_state ON public.tournaments(state);
CREATE INDEX IF NOT EXISTS idx_tournaments_public_search ON public.tournaments(show_in_public_search) WHERE show_in_public_search = true;