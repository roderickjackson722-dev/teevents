ALTER TABLE public.college_tournament_players ADD COLUMN IF NOT EXISTS position text;
ALTER TABLE public.college_tournament_players DROP COLUMN IF EXISTS handicap;