ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS day_of_welcome_title text,
  ADD COLUMN IF NOT EXISTS day_of_show_welcome boolean NOT NULL DEFAULT true;