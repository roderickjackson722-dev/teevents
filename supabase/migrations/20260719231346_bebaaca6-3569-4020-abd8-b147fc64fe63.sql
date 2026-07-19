ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS leaderboard_frozen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS leaderboard_frozen_by UUID;