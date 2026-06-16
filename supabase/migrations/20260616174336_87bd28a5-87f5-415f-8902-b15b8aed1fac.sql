
-- Drop anon SELECT policies that exposed registrant PII
DROP POLICY IF EXISTS "Public can view day-of group members" ON public.tournament_registrations;
DROP POLICY IF EXISTS "Public can view day-of registrants by scoring code" ON public.tournament_registrations;

-- Drop the over-broad public write policy on tournament_scores
DROP POLICY IF EXISTS "Public can write scores via group code" ON public.tournament_scores;

-- Day-of player RPC: returns player, group roster (names only), and top leaderboard
CREATE OR REPLACE FUNCTION public.get_day_of_player(_tournament_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  grp jsonb;
  leaders jsonb;
BEGIN
  SELECT id, first_name, last_name, group_number, group_position, scoring_code, group_scoring_code
    INTO r
  FROM public.tournament_registrations
  WHERE tournament_id = _tournament_id
    AND scoring_code IS NOT NULL
    AND upper(scoring_code) = upper(_code)
    AND EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = _tournament_id
        AND t.site_published = true
        AND coalesce(t.day_of_page_enabled, true) = true
        AND coalesce(t.day_of_page_mode, 'live') = 'live'
    )
  LIMIT 1;

  IF r.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF r.group_number IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'first_name', first_name,
        'last_name', last_name,
        'group_number', group_number,
        'group_position', group_position,
        'scoring_code', scoring_code,
        'group_scoring_code', group_scoring_code
      ) ORDER BY group_position NULLS LAST
    ), '[]'::jsonb)
    INTO grp
    FROM public.tournament_registrations
    WHERE tournament_id = _tournament_id AND group_number = r.group_number;
  ELSE
    grp := '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object('name', name, 'total', total) ORDER BY total ASC), '[]'::jsonb)
  INTO leaders
  FROM (
    SELECT (rg.first_name || ' ' || rg.last_name) AS name, sum(s.strokes)::int AS total
    FROM public.tournament_scores s
    JOIN public.tournament_registrations rg ON rg.id = s.registration_id
    WHERE s.tournament_id = _tournament_id
    GROUP BY rg.id, rg.first_name, rg.last_name
    ORDER BY total ASC
    LIMIT 10
  ) x;

  RETURN jsonb_build_object('player', to_jsonb(r), 'group', grp, 'leaders', leaders);
END $$;

-- Look up a player's group number by scoring_code or email (no PII returned)
CREATE OR REPLACE FUNCTION public.live_scoring_lookup_group(_tournament_id uuid, _scoring_code text, _email text)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT group_number FROM public.tournament_registrations
  WHERE tournament_id = _tournament_id
    AND group_number IS NOT NULL
    AND (
      (_scoring_code IS NOT NULL AND scoring_code IS NOT NULL AND upper(scoring_code) = upper(_scoring_code))
      OR (_email IS NOT NULL AND email IS NOT NULL AND lower(email) = lower(_email))
    )
  LIMIT 1;
$$;

-- Return live scoring group roster + existing scores
CREATE OR REPLACE FUNCTION public.get_live_scoring_group(_tournament_id uuid, _group_number integer)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  players jsonb;
  scores jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'first_name', first_name,
      'last_name', last_name,
      'handicap', handicap,
      'group_number', group_number,
      'playing_handicap', playing_handicap,
      'strokes_per_hole', strokes_per_hole,
      'scoring_code', scoring_code
    ) ORDER BY group_position NULLS LAST
  ), '[]'::jsonb)
  INTO players
  FROM public.tournament_registrations
  WHERE tournament_id = _tournament_id AND group_number = _group_number;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'registration_id', s.registration_id,
    'hole_number', s.hole_number,
    'strokes', s.strokes
  )), '[]'::jsonb)
  INTO scores
  FROM public.tournament_scores s
  WHERE s.tournament_id = _tournament_id
    AND s.registration_id IN (
      SELECT id FROM public.tournament_registrations
      WHERE tournament_id = _tournament_id AND group_number = _group_number
    );

  RETURN jsonb_build_object('players', players, 'scores', scores);
END $$;

-- Save scores. Caller must prove knowledge of a scoring_code or group_scoring_code
CREATE OR REPLACE FUNCTION public.save_group_scores(_tournament_id uuid, _code text, _scores jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  allowed_ids uuid[];
  group_num integer;
  row jsonb;
  rid uuid;
  hn int;
  st int;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RAISE EXCEPTION 'Missing scoring code';
  END IF;

  SELECT group_number INTO group_num
  FROM public.tournament_registrations
  WHERE tournament_id = _tournament_id
    AND (
      (group_scoring_code IS NOT NULL AND upper(group_scoring_code) = upper(_code)) OR
      (scoring_code IS NOT NULL AND upper(scoring_code) = upper(_code))
    )
  LIMIT 1;

  IF group_num IS NULL THEN
    RAISE EXCEPTION 'Invalid scoring code';
  END IF;

  SELECT array_agg(id) INTO allowed_ids
  FROM public.tournament_registrations
  WHERE tournament_id = _tournament_id AND group_number = group_num;

  FOR row IN SELECT * FROM jsonb_array_elements(_scores) LOOP
    rid := (row->>'registration_id')::uuid;
    hn  := (row->>'hole_number')::int;
    st  := (row->>'strokes')::int;
    IF rid IS NULL OR hn IS NULL OR st IS NULL THEN CONTINUE; END IF;
    IF NOT (rid = ANY(allowed_ids)) THEN CONTINUE; END IF;
    IF hn < 1 OR hn > 18 OR st < 1 OR st > 20 THEN CONTINUE; END IF;

    INSERT INTO public.tournament_scores (tournament_id, registration_id, hole_number, strokes)
    VALUES (_tournament_id, rid, hn, st)
    ON CONFLICT (registration_id, hole_number) DO UPDATE SET strokes = EXCLUDED.strokes;
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.get_day_of_player(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_scoring_lookup_group(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_live_scoring_group(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_group_scores(uuid, text, jsonb) TO anon, authenticated;
