ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS leaderboard_sponsor_banner_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS leaderboard_sponsor_rotation_order text NOT NULL DEFAULT 'sequential';