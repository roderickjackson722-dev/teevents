ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS pairings_group_size integer NOT NULL DEFAULT 4;