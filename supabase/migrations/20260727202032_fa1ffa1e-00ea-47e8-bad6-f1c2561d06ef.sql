ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS min_drives_per_player INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS drives_used INTEGER NOT NULL DEFAULT 0;