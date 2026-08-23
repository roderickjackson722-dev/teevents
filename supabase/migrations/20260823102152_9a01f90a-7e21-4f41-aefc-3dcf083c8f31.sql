-- Some emailed scoring codes are shared by players in different round-2 groups.
-- These helpers let a player pick their group instead of failing/misrouting.
CREATE OR REPLACE FUNCTION public.scoring_code_group_options(_tournament_id uuid, _code text, _round_number integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_assign jsonb;
  rn integer := GREATEST(COALESCE(_round_number, 1), 1);
  v_out jsonb;
BEGIN
  SELECT t.pairings_config -> 'assignmentsByDay' -> ((rn - 1)::text)
    INTO v_assign
  FROM public.tournaments t
  WHERE t.id = _tournament_id;

  IF v_assign IS NULL OR jsonb_typeof(v_assign) <> 'object' THEN
    RETURN '[]'::jsonb;
  END IF;

  WITH owners AS (
    SELECT DISTINCT (v_assign -> r.id::text ->> 'g')::integer AS grp
    FROM public.tournament_registrations r
    WHERE r.tournament_id = _tournament_id
      AND (
        (r.scoring_code IS NOT NULL AND upper(r.scoring_code) = upper(trim(_code)))
        OR (r.group_scoring_code IS NOT NULL AND upper(r.group_scoring_code) = upper(trim(_code)))
      )
      AND v_assign -> r.id::text ->> 'g' IS NOT NULL
  ), members AS (
    SELECT o.grp,
           string_agg(r.first_name || ' ' || r.last_name, ', '
             ORDER BY COALESCE((v_assign -> r.id::text ->> 'p')::integer, 999)) AS names
    FROM owners o
    JOIN public.tournament_registrations r
      ON r.tournament_id = _tournament_id
     AND (v_assign -> r.id::text ->> 'g')::integer = o.grp
    GROUP BY o.grp
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('group_number', grp, 'players', names) ORDER BY grp), '[]'::jsonb)
    INTO v_out
  FROM members;

  RETURN v_out;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_round_group_by_number(_tournament_id uuid, _group_number integer, _round_number integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_assign jsonb;
  ids uuid[];
  players jsonb;
  scores jsonb;
  rn integer := GREATEST(COALESCE(_round_number, 1), 1);
BEGIN
  SELECT t.pairings_config -> 'assignmentsByDay' -> ((rn - 1)::text)
    INTO v_assign
  FROM public.tournaments t
  WHERE t.id = _tournament_id;

  IF v_assign IS NULL OR jsonb_typeof(v_assign) <> 'object' THEN
    RETURN NULL;
  END IF;

  SELECT array_agg(r.id ORDER BY COALESCE((v_assign -> r.id::text ->> 'p')::integer, 999), r.last_name, r.first_name)
    INTO ids
  FROM public.tournament_registrations r
  WHERE r.tournament_id = _tournament_id
    AND (v_assign -> r.id::text ->> 'g')::integer = _group_number;

  IF ids IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'first_name', r.first_name,
      'last_name', r.last_name,
      'handicap', r.handicap,
      'group_number', _group_number,
      'playing_handicap', r.playing_handicap,
      'strokes_per_hole', r.strokes_per_hole,
      'scoring_code', r.scoring_code,
      'starting_hole', r.starting_hole
    ) ORDER BY COALESCE((v_assign -> r.id::text ->> 'p')::integer, 999), r.last_name, r.first_name
  ), '[]'::jsonb)
    INTO players
  FROM public.tournament_registrations r
  WHERE r.id = ANY(ids);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'registration_id', s.registration_id,
    'hole_number', s.hole_number,
    'strokes', s.strokes,
    'round_number', coalesce(s.round_number, 1)
  )), '[]'::jsonb)
    INTO scores
  FROM public.tournament_scores s
  WHERE s.tournament_id = _tournament_id
    AND s.registration_id = ANY(ids)
    AND s.round_number = rn;

  RETURN jsonb_build_object('players', players, 'scores', scores, 'group_number', _group_number, 'round_number', rn);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.scoring_code_group_options(uuid, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_round_group_by_number(uuid, integer, integer) TO anon, authenticated;