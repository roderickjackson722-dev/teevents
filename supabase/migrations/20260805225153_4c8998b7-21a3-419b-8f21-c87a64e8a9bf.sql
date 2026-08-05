ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS pairings_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pairings_locked_at timestamptz;