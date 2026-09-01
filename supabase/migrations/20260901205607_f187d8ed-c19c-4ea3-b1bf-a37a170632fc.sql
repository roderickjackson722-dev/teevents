REVOKE ALL ON FUNCTION public.scoring_admin_context(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.scoring_admin_save_round(
  _token UUID, _tournament_id UUID, _registration_id UUID, _round_number INTEGER, _scores JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hole TEXT;
  val INTEGER;
BEGIN
  IF NOT public.scoring_admin_can_access(_token, _tournament_id) THEN
    RAISE EXCEPTION 'Not authorized for this event';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tournament_registrations r
                  WHERE r.id = _registration_id AND r.tournament_id = _tournament_id) THEN
    RAISE EXCEPTION 'Player not in this event';
  END IF;

  FOR hole IN SELECT jsonb_object_keys(_scores) LOOP
    val := NULLIF(_scores ->> hole, '')::INTEGER;
    IF val IS NULL THEN
      DELETE FROM public.tournament_scores
       WHERE tournament_id = _tournament_id AND registration_id = _registration_id
         AND COALESCE(round_number, 1) = _round_number AND hole_number = hole::INTEGER;
    ELSE
      IF val < 1 OR val > 20 THEN RAISE EXCEPTION 'Invalid strokes: %', val; END IF;
      INSERT INTO public.tournament_scores (tournament_id, registration_id, round_number, hole_number, strokes)
      VALUES (_tournament_id, _registration_id, _round_number, hole::INTEGER, val)
      ON CONFLICT (registration_id, round_number, hole_number)
        DO UPDATE SET strokes = EXCLUDED.strokes, updated_at = now();
    END IF;
  END LOOP;
  RETURN true;
END;
$$;