CREATE OR REPLACE FUNCTION public.get_group_scoring_roster(_tournament_id uuid, _code text, _round_number integer DEFAULT 1)
 RETURNS TABLE(id uuid, first_name text, last_name text, group_position integer, playing_handicap numeric, course_handicap numeric, handicap numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
         r.playing_handicap::numeric, r.course_handicap::numeric, r.handicap::numeric
  FROM public.tournament_registrations r
  WHERE r.id = ANY(v_ids)
  ORDER BY 4 NULLS LAST, r.last_name;
END $function$;