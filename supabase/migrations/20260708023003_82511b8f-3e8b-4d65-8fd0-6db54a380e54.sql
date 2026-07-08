ALTER TABLE public.college_tournaments ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_college_tournaments_archived_at ON public.college_tournaments(archived_at);