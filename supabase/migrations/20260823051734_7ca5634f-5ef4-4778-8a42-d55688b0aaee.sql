-- Helper: which players a scoring code may score for in a given round.
-- Uses the round's saved pairings snapshot when present, otherwise the live group.
CREATE OR REPLACE FUNCTION public.scoring_code_group_ids(_tournament_id uuid, _code text, _round_number integer DEFAULT 1)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assign jsonb;
  v_group text;
  v_ids uuid[];
  v_group_num integer;
  rn int := GREATEST(COALESCE(_round_number, 1), 1);
BEGIN
  SELECT t.pairings_config -> 'assignmentsByDay' -> ((rn - 1)::text)
    INTO v_assign
  FROM public.tournaments t
  WHERE t.id = _tournament_id;

  IF v_assign IS NOT NULL AND jsonb_typeof(v_assign) = 'object' THEN
    SELECT (v_assign -> r.id::text ->> 'g') INTO v_group
    FROM public.tournament_registrations r
    WHERE r.tournament_id = _tournament_id
      AND (
        (r.group_scoring_code IS NOT NULL AND upper(r.group_scoring_code) = upper(_code)) OR
        (r.scoring_code IS NOT NULL AND upper(r.scoring_code) = upper(_code))
      )
      AND (v_assign -> r.id::text ->> 'g') IS NOT NULL
    LIMIT 1;

    IF v_group IS NOT NULL THEN
      SELECT array_agg(r.id) INTO v_ids
      FROM public.tournament_registrations r
      WHERE r.tournament_id = _tournament_id
        AND (v_assign -> r.id::text ->> 'g') = v_group;
      IF v_ids IS NOT NULL THEN
        RETURN v_ids;
      END IF;
    END IF;
  END IF;

  SELECT r.group_number INTO v_group_num
  FROM public.tournament_registrations r
  WHERE r.tournament_id = _tournament_id
    AND (
      (r.group_scoring_code IS NOT NULL AND upper(r.group_scoring_code) = upper(_code)) OR
      (r.scoring_code IS NOT NULL AND upper(r.scoring_code) = upper(_code))
    )
  LIMIT 1;

  IF v_group_num IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT array_agg(r.id) INTO v_ids
  FROM public.tournament_registrations r
  WHERE r.tournament_id = _tournament_id AND r.group_number = v_group_num;

  RETURN v_ids;
END $$;

GRANT EXECUTE ON FUNCTION public.scoring_code_group_ids(uuid, text, integer) TO anon, authenticated, service_role;

-- Round-aware group roster for the scoring app.
DROP FUNCTION IF EXISTS public.get_group_scoring_roster(uuid, text);

CREATE OR REPLACE FUNCTION public.get_group_scoring_roster(_tournament_id uuid, _code text, _round_number integer DEFAULT 1)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  group_position integer,
  playing_handicap numeric,
  course_handicap numeric,
  handicap numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[];
  v_assign jsonb;
  rn int := GREATEST(COALESCE(_round_number, 1), 1);
BEGIN
  v_ids := public.scoring_code_group_ids(_tournament_id, _code, rn);
  IF v_ids IS NULL THEN
    RETURN;
  END IF;

  SELECT t.pairings_config -> 'assignmentsByDay' -> ((rn - 1)::text)
    INTO v_assign
  FROM public.tournaments t
  WHERE t.id = _tournament_id
    AND t.site_published = true
    AND coalesce(t.day_of_page_enabled, true) = true
    AND coalesce(t.day_of_page_mode, 'live') = 'live';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT r.id, r.first_name, r.last_name,
         COALESCE(
           CASE WHEN v_assign IS NOT NULL AND jsonb_typeof(v_assign) = 'object'
                THEN (v_assign -> r.id::text ->> 'p')::int END,
           r.group_position
         ) AS group_position,
         r.playing_handicap, r.course_handicap, r.handicap
  FROM public.tournament_registrations r
  WHERE r.id = ANY(v_ids)
  ORDER BY 4 NULLS LAST, r.last_name;
END $$;

GRANT EXECUTE ON FUNCTION public.get_group_scoring_roster(uuid, text, integer) TO anon, authenticated;

-- Saving/clearing now validates against the round's group, not just round 1's.
CREATE OR REPLACE FUNCTION public.save_group_scores(_tournament_id uuid, _code text, _scores jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  allowed_ids uuid[];
  row jsonb;
  rid uuid;
  hn int;
  st int;
  rn int;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RAISE EXCEPTION 'Missing scoring code';
  END IF;

  FOR row IN SELECT * FROM jsonb_array_elements(_scores) LOOP
    rid := (row->>'registration_id')::uuid;
    hn  := (row->>'hole_number')::int;
    st  := (row->>'strokes')::int;
    rn  := COALESCE((row->>'round_number')::int, 1);
    IF rid IS NULL OR hn IS NULL OR st IS NULL THEN CONTINUE; END IF;
    IF hn < 1 OR hn > 18 OR st < 1 OR st > 20 THEN CONTINUE; END IF;
    IF rn < 1 OR rn > 8 THEN rn := 1; END IF;

    allowed_ids := public.scoring_code_group_ids(_tournament_id, _code, rn);
    IF allowed_ids IS NULL THEN
      RAISE EXCEPTION 'Invalid scoring code';
    END IF;
    IF NOT (rid = ANY(allowed_ids)) THEN CONTINUE; END IF;

    IF public.is_tournament_round_closed(_tournament_id, rn) THEN
      RAISE EXCEPTION 'Round % is closed — scores can no longer be changed.', rn;
    END IF;

    INSERT INTO public.tournament_scores (tournament_id, registration_id, hole_number, strokes, round_number)
    VALUES (_tournament_id, rid, hn, st, rn)
    ON CONFLICT (registration_id, round_number, hole_number) DO UPDATE SET strokes = EXCLUDED.strokes;
  END LOOP;
END $function$;

CREATE OR REPLACE FUNCTION public.clear_group_hole_scores(_tournament_id uuid, _code text, _hole_number integer, _round_number integer DEFAULT 1, _registration_id uuid DEFAULT NULL::uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  allowed_ids uuid[];
  rn int := COALESCE(_round_number, 1);
  removed int := 0;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RAISE EXCEPTION 'Missing scoring code';
  END IF;
  IF _hole_number IS NULL OR _hole_number < 1 OR _hole_number > 18 THEN
    RAISE EXCEPTION 'Invalid hole number';
  END IF;
  IF rn < 1 OR rn > 8 THEN rn := 1; END IF;

  IF public.is_tournament_round_closed(_tournament_id, rn) THEN
    RAISE EXCEPTION 'Round % is closed — scores can no longer be changed.', rn;
  END IF;

  allowed_ids := public.scoring_code_group_ids(_tournament_id, _code, rn);
  IF allowed_ids IS NULL THEN
    RAISE EXCEPTION 'Invalid scoring code';
  END IF;

  IF _registration_id IS NOT NULL AND NOT (_registration_id = ANY(allowed_ids)) THEN
    RAISE EXCEPTION 'Player not in your group';
  END IF;

  DELETE FROM public.tournament_scores
  WHERE tournament_id = _tournament_id
    AND hole_number = _hole_number
    AND round_number = rn
    AND registration_id = ANY(allowed_ids)
    AND (_registration_id IS NULL OR registration_id = _registration_id);

  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END $function$;