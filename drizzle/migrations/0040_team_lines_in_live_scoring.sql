DROP FUNCTION IF EXISTS public.get_public_leaderboard_scores(uuid);
CREATE FUNCTION public.get_public_leaderboard_scores(_tournament_id uuid)
 RETURNS TABLE(registration_id uuid, hole_number integer, strokes integer, round_number integer, first_name text, last_name text, group_number integer, team_name text, flight_id uuid, flight_name text, group_id uuid)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT s.registration_id, s.hole_number, s.strokes, COALESCE(s.round_number, 1) AS round_number,
         r.first_name, r.last_name, r.group_number,
         COALESCE(NULLIF(btrim(rg.team_name), ''), NULLIF(btrim(rg.group_name), ''), NULLIF(btrim(r.group_label), '')) AS team_name,
         r.flight_id, ft.tier_name AS flight_name, r.group_id
  FROM public.tournament_scores s
  JOIN public.tournament_registrations r ON r.id = s.registration_id
  LEFT JOIN public.registration_groups rg ON rg.id = r.group_id
  LEFT JOIN public.tournament_tiers ft ON ft.id = r.flight_id
  JOIN public.tournaments t ON t.id = s.tournament_id
  WHERE s.tournament_id = _tournament_id
    AND t.site_published = true
    AND lower(coalesce(r.status, 'active')) <> 'wd'
    AND lower(coalesce(r.payment_status, '')) NOT IN ('refunded', 'cancelled', 'canceled', 'failed', 'void')
  ORDER BY r.last_name, r.first_name, COALESCE(s.round_number, 1), s.hole_number, s.registration_id;
$function$;
GRANT EXECUTE ON FUNCTION public.get_public_leaderboard_scores(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_round_group_by_number(_tournament_id uuid, _group_number integer, _round_number integer DEFAULT 1)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_assign jsonb; ids uuid[]; players jsonb; scores jsonb;
  rn integer := GREATEST(COALESCE(_round_number, 1), 1);
BEGIN
  SELECT t.pairings_config -> 'assignmentsByDay' -> ((rn - 1)::text) INTO v_assign
  FROM public.tournaments t WHERE t.id = _tournament_id;
  IF v_assign IS NULL OR jsonb_typeof(v_assign) <> 'object' THEN RETURN NULL; END IF;

  SELECT array_agg(r.id ORDER BY COALESCE((v_assign -> r.id::text ->> 'p')::integer, 999), r.last_name, r.first_name)
    INTO ids
  FROM public.tournament_registrations r
  WHERE r.tournament_id = _tournament_id AND (v_assign -> r.id::text ->> 'g')::integer = _group_number;
  IF ids IS NULL THEN RETURN NULL; END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'first_name', r.first_name, 'last_name', r.last_name, 'handicap', r.handicap,
      'group_number', _group_number, 'playing_handicap', r.playing_handicap,
      'strokes_per_hole', r.strokes_per_hole, 'scoring_code', r.scoring_code,
      'starting_hole', r.starting_hole, 'is_captain', r.is_captain, 'group_id', r.group_id,
      'team_name', COALESCE(NULLIF(btrim(rg.team_name), ''), NULLIF(btrim(rg.group_name), ''))
    ) ORDER BY COALESCE((v_assign -> r.id::text ->> 'p')::integer, 999), r.last_name, r.first_name
  ), '[]'::jsonb) INTO players
  FROM public.tournament_registrations r
  LEFT JOIN public.registration_groups rg ON rg.id = r.group_id
  WHERE r.id = ANY(ids);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'registration_id', s.registration_id, 'hole_number', s.hole_number,
    'strokes', s.strokes, 'round_number', coalesce(s.round_number, 1)
  )), '[]'::jsonb) INTO scores
  FROM public.tournament_scores s
  WHERE s.tournament_id = _tournament_id AND s.registration_id = ANY(ids) AND s.round_number = rn;

  RETURN jsonb_build_object('players', players, 'scores', scores, 'group_number', _group_number, 'round_number', rn);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_round_scoring_group(_tournament_id uuid, _code text, _round_number integer DEFAULT 1)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  players jsonb; scores jsonb; ids uuid[]; v_assign jsonb; v_group text;
  rn integer := GREATEST(COALESCE(_round_number, 1), 1);
BEGIN
  ids := public.scoring_code_group_ids(_tournament_id, _code, rn);
  IF ids IS NULL THEN RETURN NULL; END IF;

  SELECT t.pairings_config -> 'assignmentsByDay' -> ((rn - 1)::text) INTO v_assign
  FROM public.tournaments t WHERE t.id = _tournament_id;

  IF v_assign IS NOT NULL AND jsonb_typeof(v_assign) = 'object' THEN
    SELECT v_assign -> r.id::text ->> 'g' INTO v_group
    FROM public.tournament_registrations r
    WHERE r.id = ANY(ids) AND v_assign -> r.id::text ->> 'g' IS NOT NULL
    ORDER BY COALESCE((v_assign -> r.id::text ->> 'p')::integer, 999), r.id
    LIMIT 1;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'first_name', r.first_name, 'last_name', r.last_name, 'handicap', r.handicap,
      'group_number', COALESCE(v_group::integer, r.group_number),
      'playing_handicap', r.playing_handicap, 'strokes_per_hole', r.strokes_per_hole,
      'scoring_code', r.scoring_code, 'starting_hole', r.starting_hole,
      'is_captain', r.is_captain, 'group_id', r.group_id,
      'team_name', COALESCE(NULLIF(btrim(rg.team_name), ''), NULLIF(btrim(rg.group_name), ''))
    ) ORDER BY COALESCE(
      CASE WHEN v_assign IS NOT NULL AND jsonb_typeof(v_assign) = 'object'
           THEN (v_assign -> r.id::text ->> 'p')::integer END,
      r.group_position, 999
    ), r.last_name, r.first_name
  ), '[]'::jsonb) INTO players
  FROM public.tournament_registrations r
  LEFT JOIN public.registration_groups rg ON rg.id = r.group_id
  WHERE r.id = ANY(ids);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'registration_id', s.registration_id, 'hole_number', s.hole_number,
    'strokes', s.strokes, 'round_number', coalesce(s.round_number, 1)
  )), '[]'::jsonb) INTO scores
  FROM public.tournament_scores s
  WHERE s.tournament_id = _tournament_id AND s.registration_id = ANY(ids) AND s.round_number = rn;

  RETURN jsonb_build_object('players', players, 'scores', scores,
    'group_number', COALESCE(v_group::integer, NULL), 'round_number', rn);
END;
$function$;