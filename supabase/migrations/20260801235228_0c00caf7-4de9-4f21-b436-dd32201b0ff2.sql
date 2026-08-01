CREATE OR REPLACE FUNCTION public.get_live_scoring_group(_tournament_id uuid, _group_number integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  players jsonb;
  scores jsonb;
  tname text;
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
      'scoring_code', scoring_code,
      'is_captain', coalesce(is_captain, false),
      'group_leader', coalesce(group_leader, false)
    ) ORDER BY group_position NULLS LAST
  ), '[]'::jsonb)
  INTO players
  FROM public.tournament_registrations
  WHERE tournament_id = _tournament_id AND group_number = _group_number;

  SELECT g.team_name INTO tname
  FROM public.registration_groups g
  WHERE g.tournament_id = _tournament_id
    AND g.id IN (
      SELECT r.group_id FROM public.tournament_registrations r
      WHERE r.tournament_id = _tournament_id AND r.group_number = _group_number AND r.group_id IS NOT NULL
    )
  LIMIT 1;

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

  RETURN jsonb_build_object('players', players, 'scores', scores, 'team_name', tname);
END $function$;