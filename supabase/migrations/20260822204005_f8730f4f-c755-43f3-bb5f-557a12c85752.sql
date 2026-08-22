ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS skins_opt_in BOOLEAN;