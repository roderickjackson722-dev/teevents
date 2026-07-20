
-- Update member_submit_score to apply WHS Course Handicap + Net Double Bogey cap
CREATE OR REPLACE FUNCTION public.member_submit_score(_code text, _league_slug text, _event_id uuid, _hole integer, _gross integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _member_id uuid;
  _handicap numeric;
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

  SELECT course_id INTO _course_id FROM public.league_events WHERE id = _event_id;
  IF _course_id IS NOT NULL THEN
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

  -- Net Double Bogey cap: hole par + strokes received + 2
  _cap := _par + _strokes_on_hole + 2;
  _net := GREATEST(1, LEAST(_gross, _cap) - _strokes_on_hole);

  INSERT INTO public.league_event_scores (event_id, member_id, hole_number, gross_score, net_score)
  VALUES (_event_id, _member_id, _hole, LEAST(_gross, _cap), _net)
  ON CONFLICT (event_id, member_id, hole_number)
  DO UPDATE SET gross_score = EXCLUDED.gross_score, net_score = EXCLUDED.net_score, updated_at = now();
END;
$function$;
