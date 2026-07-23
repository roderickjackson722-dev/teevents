ALTER TABLE public.college_surveys
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS tournament_id uuid REFERENCES public.college_tournaments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_college_surveys_tournament_id ON public.college_surveys(tournament_id);