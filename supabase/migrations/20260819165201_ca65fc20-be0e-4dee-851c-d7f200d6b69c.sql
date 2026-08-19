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
    'strokes', s.strokes,
    'round_number', coalesce(s.round_number, 1)
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

GRANT EXECUTE ON FUNCTION public.get_live_scoring_group(uuid, integer) TO anon, authenticated;