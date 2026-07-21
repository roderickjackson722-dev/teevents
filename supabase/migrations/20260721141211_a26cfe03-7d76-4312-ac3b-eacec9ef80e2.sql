
-- Update member_submit_score to prefer league_courses (league-owned course details)
CREATE OR REPLACE FUNCTION public.member_submit_score(
  _code text, _league_slug text, _event_id uuid, _hole int, _gross int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _member_id uuid;
  _handicap numeric;
  _lg_course_id uuid;
  _course_id uuid;
  _par int;
  _slope int;
  _rating numeric;
  _course_par int;
  _hole_pars jsonb;
  _hole_sis jsonb;
  _course_hcp int;
  _strokes_on_hole int := 0;
  _net int;
  _cap int;
BEGIN
  SELECT lm.id, lm.handicap_index INTO _member_id, _handicap
  FROM public.league_members lm
  JOIN public.golf_leagues gl ON gl.id = lm.league_id
  WHERE gl.league_slug = _league_slug AND upper(lm.scoring_code) = upper(_code);

  IF _member_id IS NULL THEN
    RAISE EXCEPTION 'Invalid scoring code';
  END IF;

  SELECT league_course_id, course_id INTO _lg_course_id, _course_id
  FROM public.league_events WHERE id = _event_id;

  IF _lg_course_id IS NOT NULL THEN
    SELECT par_total, slope_rating, course_rating, hole_pars, hole_stroke_indexes
      INTO _course_par, _slope, _rating, _hole_pars, _hole_sis
      FROM public.league_courses WHERE id = _lg_course_id;
  ELSIF _course_id IS NOT NULL THEN
    SELECT par_total, slope_rating, course_rating, hole_pars, hole_stroke_indexes
      INTO _course_par, _slope, _rating, _hole_pars, _hole_sis
      FROM public.golf_courses WHERE id = _course_id;
  END IF;

  _par := COALESCE(NULLIF((_hole_pars ->> (_hole - 1)::text), '')::int, 4);

  IF _handicap IS NOT NULL AND _slope IS NOT NULL AND _rating IS NOT NULL AND _course_par IS NOT NULL THEN
    _course_hcp := ROUND(_handicap * (_slope::numeric / 113) + (_rating - _course_par))::int;
  ELSIF _handicap IS NOT NULL THEN
    _course_hcp := ROUND(_handicap)::int;
  ELSE
    _course_hcp := 0;
  END IF;

  IF _hole_sis IS NOT NULL AND _course_hcp > 0 THEN
    DECLARE _si int;
    BEGIN
      _si := COALESCE(NULLIF((_hole_sis ->> (_hole - 1)::text), '')::int, 18);
      _strokes_on_hole := GREATEST(0, FLOOR(_course_hcp::numeric / 18)::int)
                        + CASE WHEN _si <= (_course_hcp % 18) THEN 1 ELSE 0 END;
    END;
  ELSE
    _strokes_on_hole := GREATEST(0, ROUND(_course_hcp::numeric / 18)::int);
  END IF;

  _cap := _par + _strokes_on_hole + 2;
  _net := GREATEST(1, LEAST(_gross, _cap) - _strokes_on_hole);

  INSERT INTO public.league_event_scores (event_id, member_id, hole_number, gross_score, net_score)
  VALUES (_event_id, _member_id, _hole, LEAST(_gross, _cap), _net)
  ON CONFLICT (event_id, member_id, hole_number)
  DO UPDATE SET gross_score = EXCLUDED.gross_score, net_score = EXCLUDED.net_score;
END;
$$;

-- Recompute one member's WHS Handicap Index (best 8 of last 20 differentials).
CREATE OR REPLACE FUNCTION public.recalculate_member_handicap(_member_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _index numeric;
  _best_avg numeric;
  _course_hcp int;
  _latest_course record;
BEGIN
  IF _member_id IS NULL THEN RETURN NULL; END IF;

  -- Round-level differentials from last 20 completed rounds (18 holes recorded).
  WITH rounds AS (
    SELECT
      s.event_id,
      SUM(s.gross_score)::int AS adjusted_gross,
      COUNT(*)::int AS holes_played,
      MAX(e.event_date) AS event_date,
      COALESCE(lc.course_rating, gc.course_rating) AS course_rating,
      COALESCE(lc.slope_rating, gc.slope_rating) AS slope_rating
    FROM public.league_event_scores s
    JOIN public.league_events e ON e.id = s.event_id
    LEFT JOIN public.league_courses lc ON lc.id = e.league_course_id
    LEFT JOIN public.golf_courses gc ON gc.id = e.course_id
    WHERE s.member_id = _member_id
    GROUP BY s.event_id, lc.course_rating, gc.course_rating, lc.slope_rating, gc.slope_rating
    HAVING COUNT(*) >= 18
       AND COALESCE(lc.course_rating, gc.course_rating) IS NOT NULL
       AND COALESCE(lc.slope_rating, gc.slope_rating) IS NOT NULL
  ),
  recent AS (
    SELECT event_id, event_date,
      ROUND((113.0 / slope_rating) * (adjusted_gross - course_rating), 1) AS differential
    FROM rounds
    ORDER BY event_date DESC, event_id DESC
    LIMIT 20
  ),
  best AS (
    SELECT differential FROM recent ORDER BY differential ASC
    LIMIT CASE
      WHEN (SELECT COUNT(*) FROM recent) >= 20 THEN 8
      WHEN (SELECT COUNT(*) FROM recent) >= 15 THEN 6
      WHEN (SELECT COUNT(*) FROM recent) >= 10 THEN 4
      WHEN (SELECT COUNT(*) FROM recent) >= 6 THEN 3
      WHEN (SELECT COUNT(*) FROM recent) >= 4 THEN 2
      WHEN (SELECT COUNT(*) FROM recent) >= 1 THEN 1
      ELSE 0
    END
  )
  SELECT AVG(differential) INTO _best_avg FROM best;

  IF _best_avg IS NULL THEN
    -- Not enough data — leave existing index alone but stamp playing/course from latest course.
    SELECT lc.par_total, lc.course_rating, lc.slope_rating
      INTO _latest_course
      FROM public.league_events e
      JOIN public.league_courses lc ON lc.id = e.league_course_id
      JOIN public.league_members m ON m.league_id = e.league_id
      WHERE m.id = _member_id
      ORDER BY e.event_date DESC
      LIMIT 1;

    SELECT handicap_index INTO _index FROM public.league_members WHERE id = _member_id;
    IF _index IS NOT NULL AND _latest_course.slope_rating IS NOT NULL THEN
      _course_hcp := ROUND(_index * (_latest_course.slope_rating::numeric / 113)
                          + (_latest_course.course_rating - _latest_course.par_total))::int;
      UPDATE public.league_members
        SET course_handicap = _course_hcp,
            playing_handicap = _course_hcp,
            handicap_updated_at = now()
        WHERE id = _member_id;
    END IF;
    RETURN _index;
  END IF;

  _index := ROUND(_best_avg, 1);

  SELECT lc.par_total, lc.course_rating, lc.slope_rating
    INTO _latest_course
    FROM public.league_events e
    JOIN public.league_courses lc ON lc.id = e.league_course_id
    JOIN public.league_members m ON m.league_id = e.league_id
    WHERE m.id = _member_id
    ORDER BY e.event_date DESC
    LIMIT 1;

  IF _latest_course.slope_rating IS NOT NULL THEN
    _course_hcp := ROUND(_index * (_latest_course.slope_rating::numeric / 113)
                        + (_latest_course.course_rating - _latest_course.par_total))::int;
  ELSE
    _course_hcp := ROUND(_index)::int;
  END IF;

  UPDATE public.league_members
    SET handicap_index = _index,
        course_handicap = _course_hcp,
        playing_handicap = _course_hcp,
        handicap_updated_at = now()
    WHERE id = _member_id;

  RETURN _index;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_member_handicap(uuid) TO authenticated, service_role;

-- Bulk recompute for an entire league (used by scheduler / edge function).
CREATE OR REPLACE FUNCTION public.recalculate_league_handicaps(_league_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count int := 0;
  _m record;
BEGIN
  FOR _m IN SELECT id FROM public.league_members WHERE league_id = _league_id LOOP
    PERFORM public.recalculate_member_handicap(_m.id);
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_league_handicaps(uuid) TO authenticated, service_role;

-- Trigger: recompute a member's handicap whenever their scores change.
CREATE OR REPLACE FUNCTION public.trg_recalc_member_handicap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalculate_member_handicap(COALESCE(NEW.member_id, OLD.member_id));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS league_event_scores_recalc_handicap ON public.league_event_scores;
CREATE TRIGGER league_event_scores_recalc_handicap
  AFTER INSERT OR UPDATE OR DELETE ON public.league_event_scores
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_member_handicap();
