DROP POLICY IF EXISTS "Anyone can view league team pairings" ON public.league_team_pairings;
CREATE POLICY "Public can view pairings of public leagues"
ON public.league_team_pairings FOR SELECT
USING (EXISTS (SELECT 1 FROM public.golf_leagues gl WHERE gl.id = league_team_pairings.league_id AND gl.is_public = true));

DROP POLICY IF EXISTS "Anyone can view league team scores" ON public.league_team_scores;
CREATE POLICY "Public can view scores of public leagues"
ON public.league_team_scores FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.league_team_pairings p
  JOIN public.golf_leagues gl ON gl.id = p.league_id
  WHERE p.id = league_team_scores.pairing_id AND gl.is_public = true
));