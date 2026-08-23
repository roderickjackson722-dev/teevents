-- Group ids for a code, honoring a caller-selected group in the given round.
CREATE OR REPLACE FUNCTION public.scoring_code_group_ids_for_group(
  _tournament_id uuid,
  _code text,
  _round_number integer,
  _group_number integer
)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_assign jsonb;
  rn integer := GREATEST(COALESCE(_round_number, 1), 1);
  v_ok boolean := false;
  v_ids uuid[];
BEGIN
  IF _group_number IS NULL THEN
    RETURN public.scoring_code_group_ids(_tournament_id, _code, rn);
  END IF;

  SELECT t.pairings_config -> 'assignmentsByDay' -> ((rn - 1)::text)
    INTO v_assign
  FROM public.tournaments t
  WHERE t.id = _tournament_id;

  IF v_assign IS NULL OR jsonb_typeof(v_assign) <> 'object' THEN
    RETURN public.scoring_code_group_ids(_tournament_id, _code, rn);
  END IF;

  -- The code must belong to somebody actually in that group for this round.
  SELECT true INTO v_ok
  FROM public.tournament_registrations r
  WHERE r.tournament_id = _tournament_id
    AND (v_assign -> r.id::text ->> 'g')::integer = _group_number
    AND (
      (r.scoring_code IS NOT NULL AND upper(r.scoring_code) = upper(trim(_code)))
      OR (r.group_scoring_code IS NOT NULL AND upper(r.group_scoring_code) = upper(trim(_code)))
    )
  LIMIT 1;

  IF NOT COALESCE(v_ok, false) THEN
    RETURN public.scoring_code_group_ids(_tournament_id, _code, rn);
  END IF;

  SELECT array_agg(r.id ORDER BY COALESCE((v_assign -> r.id::text ->> 'p')::integer, 999), r.last_name, r.first_name)
    INTO v_ids
  FROM public.tournament_registrations r
  WHERE r.tournament_id = _tournament_id
    AND (v_assign -> r.id::text ->> 'g')::integer = _group_number;

  RETURN v_ids;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.scoring_code_group_ids_for_group(uuid, text, integer, integer) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.save_group_scores(uuid, text, jsonb);
CREATE FUNCTION public.save_group_scores(
  _tournament_id uuid,
  _code text,
  _scores jsonb,
  _group_number integer DEFAULT NULL
)
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

    allowed_ids := public.scoring_code_group_ids_for_group(_tournament_id, _code, rn, _group_number);
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

GRANT EXECUTE ON FUNCTION public.save_group_scores(uuid, text, jsonb, integer) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.clear_group_hole_scores(uuid, text, integer, integer, uuid);
CREATE FUNCTION public.clear_group_hole_scores(
  _tournament_id uuid,
  _code text,
  _hole_number integer,
  _round_number integer DEFAULT 1,
  _registration_id uuid DEFAULT NULL,
  _group_number integer DEFAULT NULL
)
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

  allowed_ids := public.scoring_code_group_ids_for_group(_tournament_id, _code, rn, _group_number);
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

GRANT EXECUTE ON FUNCTION public.clear_group_hole_scores(uuid, text, integer, integer, uuid, integer) TO anon, authenticated;

-- Roster for a selected group in a round (used by the scoring page after the picker).
CREATE OR REPLACE FUNCTION public.get_group_scoring_roster_for_group(
  _tournament_id uuid,
  _code text,
  _round_number integer,
  _group_number integer
)
RETURNS TABLE(id uuid, first_name text, last_name text, group_position integer, playing_handicap numeric, course_handicap numeric, handicap numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ids uuid[];
  v_assign jsonb;
  rn integer := GREATEST(COALESCE(_round_number, 1), 1);
BEGIN
  v_ids := public.scoring_code_group_ids_for_group(_tournament_id, _code, rn, _group_number);
  IF v_ids IS NULL THEN RETURN; END IF;

  SELECT t.pairings_config -> 'assignmentsByDay' -> ((rn - 1)::text)
    INTO v_assign
  FROM public.tournaments t
  WHERE t.id = _tournament_id;

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
END $function$;

GRANT EXECUTE ON FUNCTION public.get_group_scoring_roster_for_group(uuid, text, integer, integer) TO anon, authenticated;