
GRANT SELECT ON public.golf_leagues TO anon;
GRANT SELECT ON public.league_events TO anon;
GRANT SELECT ON public.league_standings TO anon;
GRANT SELECT ON public.league_members TO anon;
GRANT SELECT ON public.league_skins TO anon;

DROP POLICY IF EXISTS "Public can view public leagues" ON public.golf_leagues;
CREATE POLICY "Public can view public leagues"
  ON public.golf_leagues FOR SELECT TO anon
  USING (is_public = true);

DROP POLICY IF EXISTS "Public can view events of public leagues" ON public.league_events;
CREATE POLICY "Public can view events of public leagues"
  ON public.league_events FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.golf_leagues gl WHERE gl.id = league_events.league_id AND gl.is_public = true));

DROP POLICY IF EXISTS "Public can view standings of public leagues" ON public.league_standings;
CREATE POLICY "Public can view standings of public leagues"
  ON public.league_standings FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.golf_leagues gl WHERE gl.id = league_standings.league_id AND gl.is_public = true));

DROP POLICY IF EXISTS "Public can view members of public leagues (limited)" ON public.league_members;
CREATE POLICY "Public can view members of public leagues (limited)"
  ON public.league_members FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.golf_leagues gl WHERE gl.id = league_members.league_id AND gl.is_public = true));

DROP POLICY IF EXISTS "Public can view skins of public leagues" ON public.league_skins;
CREATE POLICY "Public can view skins of public leagues"
  ON public.league_skins FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.league_events le
    JOIN public.golf_leagues gl ON gl.id = le.league_id
    WHERE le.id = league_skins.event_id AND gl.is_public = true
  ));

CREATE OR REPLACE FUNCTION public.member_submit_score(
  _code text,
  _league_slug text,
  _event_id uuid,
  _hole int,
  _gross int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _member_id uuid;
  _handicap numeric;
  _net int;
BEGIN
  SELECT lm.id, lm.handicap_index INTO _member_id, _handicap
  FROM public.league_members lm
  JOIN public.golf_leagues gl ON gl.id = lm.league_id
  WHERE gl.league_slug = _league_slug AND upper(lm.scoring_code) = upper(_code);

  IF _member_id IS NULL THEN
    RAISE EXCEPTION 'Invalid scoring code';
  END IF;

  IF _handicap IS NOT NULL THEN
    _net := GREATEST(1, _gross - ROUND(_handicap / 18)::int);
  END IF;

  INSERT INTO public.league_event_scores (event_id, member_id, hole_number, gross_score, net_score)
  VALUES (_event_id, _member_id, _hole, _gross, _net)
  ON CONFLICT (event_id, member_id, hole_number)
  DO UPDATE SET gross_score = EXCLUDED.gross_score, net_score = EXCLUDED.net_score, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.member_submit_score(text, text, uuid, int, int) TO anon, authenticated;
