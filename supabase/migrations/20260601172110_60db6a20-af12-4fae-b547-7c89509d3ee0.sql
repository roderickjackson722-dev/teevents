ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS leaderboard_rotating_logos jsonb NOT NULL DEFAULT '[]'::jsonb;