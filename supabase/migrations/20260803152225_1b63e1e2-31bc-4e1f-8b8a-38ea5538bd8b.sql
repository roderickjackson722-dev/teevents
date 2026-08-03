ALTER TABLE public.tournament_sponsors
  ADD COLUMN IF NOT EXISTS show_on_scoring_page BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS leaderboard_sponsor_banner_position TEXT NOT NULL DEFAULT 'bottom',
  ADD COLUMN IF NOT EXISTS leaderboard_sponsor_scroll_seconds INTEGER NOT NULL DEFAULT 20;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_sponsors; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_registrations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.registration_groups; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;