ALTER TABLE public.tournaments 
  ADD COLUMN leaderboard_sponsor_interval_ms integer NOT NULL DEFAULT 5000,
  ADD COLUMN leaderboard_sponsor_style text NOT NULL DEFAULT 'banner';