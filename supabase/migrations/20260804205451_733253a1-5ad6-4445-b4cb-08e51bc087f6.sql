-- 1. hole count on league events
ALTER TABLE public.league_events ADD COLUMN IF NOT EXISTS holes integer NOT NULL DEFAULT 18;

-- 2. team pairings
CREATE TABLE IF NOT EXISTS public.league_team_pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.golf_leagues(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.league_events(id) ON DELETE CASCADE,
  team_name text NOT NULL,
  scoring_code text NOT NULL UNIQUE,
  player1_id uuid REFERENCES public.league_members(id) ON DELETE SET NULL,
  player2_id uuid REFERENCES public.league_members(id) ON DELETE SET NULL,
  holes integer NOT NULL DEFAULT 18,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_team_pairings TO authenticated;
GRANT SELECT ON public.league_team_pairings TO anon;
GRANT ALL ON public.league_team_pairings TO service_role;

ALTER TABLE public.league_team_pairings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view league team pairings"
  ON public.league_team_pairings FOR SELECT USING (true);

CREATE POLICY "League org members manage team pairings"
  ON public.league_team_pairings FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.golf_leagues gl
    WHERE gl.id = league_team_pairings.league_id
      AND public.is_org_member(gl.organization_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.golf_leagues gl
    WHERE gl.id = league_team_pairings.league_id
      AND public.is_org_member(gl.organization_id, auth.uid())
  ));

CREATE TRIGGER update_league_team_pairings_updated_at
  BEFORE UPDATE ON public.league_team_pairings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. team scores
CREATE TABLE IF NOT EXISTS public.league_team_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_id uuid NOT NULL REFERENCES public.league_team_pairings(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.league_events(id) ON DELETE CASCADE,
  hole_number integer NOT NULL,
  gross_score integer,
  net_score integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pairing_id, hole_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_team_scores TO authenticated;
GRANT SELECT ON public.league_team_scores TO anon;
GRANT ALL ON public.league_team_scores TO service_role;

ALTER TABLE public.league_team_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view league team scores"
  ON public.league_team_scores FOR SELECT USING (true);

CREATE POLICY "League org members manage team scores"
  ON public.league_team_scores FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.league_team_pairings p
    JOIN public.golf_leagues gl ON gl.id = p.league_id
    WHERE p.id = league_team_scores.pairing_id
      AND public.is_org_member(gl.organization_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.league_team_pairings p
    JOIN public.golf_leagues gl ON gl.id = p.league_id
    WHERE p.id = league_team_scores.pairing_id
      AND public.is_org_member(gl.organization_id, auth.uid())
  ));

CREATE TRIGGER update_league_team_scores_updated_at
  BEFORE UPDATE ON public.league_team_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. code generator
CREATE OR REPLACE FUNCTION public.generate_league_team_scoring_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
  i integer;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.league_team_pairings WHERE scoring_code = code);
  END LOOP;
  RETURN code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_league_team_scoring_code() TO authenticated, service_role;

-- 5. public lookup by scoring code
CREATE OR REPLACE FUNCTION public.lookup_league_team_by_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
  ev record;
  lg record;
  crs record;
  result jsonb;
BEGIN
  SELECT * INTO p FROM public.league_team_pairings
  WHERE upper(scoring_code) = upper(trim(_code)) LIMIT 1;
  IF p.id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT * INTO ev FROM public.league_events WHERE id = p.event_id;
  SELECT league_name, logo_url INTO lg FROM public.golf_leagues WHERE id = p.league_id;
  SELECT course_name, par_total, hole_pars, hole_stroke_indexes, course_rating, slope_rating
    INTO crs FROM public.league_courses WHERE id = ev.league_course_id;

  result := jsonb_build_object(
    'found', true,
    'pairing_id', p.id,
    'team_name', p.team_name,
    'scoring_code', p.scoring_code,
    'holes', COALESCE(p.holes, ev.holes, 18),
    'event_id', ev.id,
    'event_name', ev.event_name,
    'event_date', ev.event_date,
    'format_type', ev.format_type,
    'league_name', lg.league_name,
    'course_name', COALESCE(crs.course_name, ev.course_name),
    'hole_pars', crs.hole_pars,
    'players', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', m.id, 'name', m.member_name, 'handicap_index', m.handicap_index)), '[]'::jsonb)
      FROM public.league_members m
      WHERE m.id IN (p.player1_id, p.player2_id)
    ),
    'scores', (
      SELECT COALESCE(jsonb_object_agg(s.hole_number::text, s.gross_score), '{}'::jsonb)
      FROM public.league_team_scores s WHERE s.pairing_id = p.id
    )
  );
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_league_team_by_code(text) TO anon, authenticated, service_role;

-- 6. public score submission by scoring code
CREATE OR REPLACE FUNCTION public.save_league_team_scores(_code text, _scores jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
  k text;
  v integer;
  saved integer := 0;
  max_hole integer;
BEGIN
  SELECT * INTO p FROM public.league_team_pairings
  WHERE upper(scoring_code) = upper(trim(_code)) LIMIT 1;
  IF p.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid scoring code');
  END IF;

  max_hole := COALESCE(p.holes, 18);

  FOR k, v IN SELECT key, (value #>> '{}')::int FROM jsonb_each(_scores) LOOP
    IF k ~ '^[0-9]+$' AND k::int BETWEEN 1 AND max_hole AND v IS NOT NULL AND v BETWEEN 1 AND 20 THEN
      INSERT INTO public.league_team_scores (pairing_id, event_id, hole_number, gross_score)
      VALUES (p.id, p.event_id, k::int, v)
      ON CONFLICT (pairing_id, hole_number)
      DO UPDATE SET gross_score = EXCLUDED.gross_score, updated_at = now();
      saved := saved + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'saved', saved);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_league_team_scores(text, jsonb) TO anon, authenticated, service_role;