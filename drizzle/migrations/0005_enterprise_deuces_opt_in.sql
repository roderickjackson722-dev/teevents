ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS deuces_opt_in boolean NOT NULL DEFAULT false;