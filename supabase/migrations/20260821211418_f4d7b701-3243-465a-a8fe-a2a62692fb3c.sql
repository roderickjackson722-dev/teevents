CREATE OR REPLACE FUNCTION public.clear_group_hole_scores(
  _tournament_id uuid,
  _code text,
  _hole_number integer,
  _round_number integer DEFAULT 1,
  _registration_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  allowed_ids uuid[];
  group_num integer;
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

  SELECT group_number INTO group_num
  FROM public.tournament_registrations
  WHERE tournament_id = _tournament_id
    AND (
      (group_scoring_code IS NOT NULL AND upper(group_scoring_code) = upper(_code)) OR
      (scoring_code IS NOT NULL AND upper(scoring_code) = upper(_code))
    )
  LIMIT 1;

  IF group_num IS NULL THEN
    RAISE EXCEPTION 'Invalid scoring code';
  END IF;

  SELECT array_agg(id) INTO allowed_ids
  FROM public.tournament_registrations
  WHERE tournament_id = _tournament_id AND group_number = group_num;

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

GRANT EXECUTE ON FUNCTION public.clear_group_hole_scores(uuid, text, integer, integer, uuid) TO anon, authenticated, service_role;