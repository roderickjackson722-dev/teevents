ALTER TABLE public.league_events
  ADD COLUMN IF NOT EXISTS start_format text NOT NULL DEFAULT 'shotgun',
  ADD COLUMN IF NOT EXISTS tee_interval_minutes integer NOT NULL DEFAULT 10;