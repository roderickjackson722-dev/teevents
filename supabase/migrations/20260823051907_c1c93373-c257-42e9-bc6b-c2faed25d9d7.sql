-- Round-aware group payload for the live scoring app: resolves the player's
-- group from the round's saved pairings snapshot, plus that round's starting hole.
CREATE OR REPLACE FUNCTION public.get_round_scoring_group(_tournament_id uuid, _code text, _round_number integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  players jsonb;
  scores jsonb;
  ids uuid[];
  v_assign jsonb;
  v_group text;
  rn int := GREATEST(COALESCE(_round_number, 1), 1);
BEGIN
  ids := public.scoring_code_group_ids(_tournament_id, _code, rn);
  IF ids IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT t.pairings_config -> 'assignmentsByDay' -> ((rn - 1)::text)
    INTO v_assign
  FROM public.tournaments t
  WHERE t.id = _tournament_id;

  IF v_assign IS NOT NULL AND jsonb_typeof(v_assign) = 'object' THEN
    SELECT (v_assign -> r.id::text ->> 'g') INTO v_group
    FROM public.tournament_registrations r
    WHERE r.id = ANY(ids)
      AND (v_assign -> r.id::text ->> 'g') IS NOT NULL
    LIMIT 1;
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'first_name', r.first_name,
      'last_name', r.last_name,
      'handicap', r.handicap,
      'group_number', COALESCE(v_group::int, r.group_number),
      'playing_handicap', r.playing_handicap,
      'strokes_per_hole', r.strokes_per_hole,
      'scoring_code', r.scoring_code,
      'starting_hole', r.starting_hole
    ) ORDER BY COALESCE(
      CASE WHEN v_assign IS NOT NULL AND jsonb_typeof(v_assign) = 'object'
           THEN (v_assign -> r.id::text ->> 'p')::int END,
      r.group_position
    ) NULLS LAST
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
    AND s.registration_id = ANY(ids);

  RETURN jsonb_build_object(
    'players', players,
    'scores', scores,
    'group_number', COALESCE(v_group::int, NULL)
  );
END $function$;

GRANT EXECUTE ON FUNCTION public.get_round_scoring_group(uuid, text, integer) TO anon, authenticated;