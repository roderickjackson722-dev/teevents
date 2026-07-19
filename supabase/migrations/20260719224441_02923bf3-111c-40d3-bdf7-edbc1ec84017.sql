CREATE OR REPLACE FUNCTION public.mark_day_of_check_in(_tournament_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  was_checked boolean;
BEGIN
  IF _tournament_id IS NULL OR _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_input');
  END IF;

  -- Only allow when the tournament page is live-published & day-of enabled
  IF NOT EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = _tournament_id
      AND t.site_published = true
      AND COALESCE(t.day_of_page_enabled, true) = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_available');
  END IF;

  SELECT id, checked_in INTO r
  FROM public.tournament_registrations
  WHERE tournament_id = _tournament_id
    AND scoring_code IS NOT NULL
    AND upper(scoring_code) = upper(trim(_code))
  LIMIT 1;

  IF r.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  was_checked := COALESCE(r.checked_in, false);

  IF NOT was_checked THEN
    UPDATE public.tournament_registrations
      SET checked_in = true,
          check_in_time = COALESCE(check_in_time, now())
      WHERE id = r.id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'registration_id', r.id,
    'already_checked_in', was_checked
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_day_of_check_in(uuid, text) TO anon, authenticated;