ALTER TABLE public.league_event_scores REPLICA IDENTITY FULL;
ALTER TABLE public.league_team_scores REPLICA IDENTITY FULL;
ALTER TABLE public.league_team_pairings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.league_event_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.league_team_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.league_team_pairings;