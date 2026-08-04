DROP POLICY IF EXISTS "League org members manage team pairings" ON public.league_team_pairings;
CREATE POLICY "League org members manage team pairings"
ON public.league_team_pairings FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.golf_leagues gl WHERE gl.id = league_team_pairings.league_id AND public.is_org_member(auth.uid(), gl.organization_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.golf_leagues gl WHERE gl.id = league_team_pairings.league_id AND public.is_org_member(auth.uid(), gl.organization_id)));

DROP POLICY IF EXISTS "League org members manage team scores" ON public.league_team_scores;
CREATE POLICY "League org members manage team scores"
ON public.league_team_scores FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.league_team_pairings p JOIN public.golf_leagues gl ON gl.id = p.league_id WHERE p.id = league_team_scores.pairing_id AND public.is_org_member(auth.uid(), gl.organization_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.league_team_pairings p JOIN public.golf_leagues gl ON gl.id = p.league_id WHERE p.id = league_team_scores.pairing_id AND public.is_org_member(auth.uid(), gl.organization_id)));