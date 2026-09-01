ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS college_team_size integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS college_counting_scores integer NOT NULL DEFAULT 4;