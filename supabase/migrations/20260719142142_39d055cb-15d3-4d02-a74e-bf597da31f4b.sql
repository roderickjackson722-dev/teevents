ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS leaderboard_show_sponsor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS leaderboard_sponsor_name text,
  ADD COLUMN IF NOT EXISTS leaderboard_sponsor_logo_url text,
  ADD COLUMN IF NOT EXISTS leaderboard_sponsor_label text NOT NULL DEFAULT 'Presented by',
  ADD COLUMN IF NOT EXISTS leaderboard_title text;