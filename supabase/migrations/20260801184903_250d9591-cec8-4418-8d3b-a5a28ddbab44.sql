DROP TRIGGER IF EXISTS generate_scoring_code_trigger ON public.tournament_registrations;

CREATE OR REPLACE FUNCTION public.get_day_of_player(_tournament_id uuid, _code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  grp jsonb;
  leaders jsonb;
BEGIN
  SELECT id, first_name, last_name, group_number, group_position, scoring_code, group_scoring_code
    INTO r
  FROM public.tournament_registrations
  WHERE tournament_id = _tournament_id
    AND (
      (group_scoring_code IS NOT NULL AND upper(group_scoring_code) = upper(_code))
      OR (scoring_code IS NOT NULL AND upper(scoring_code) = upper(_code))
    )
    AND EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = _tournament_id
        AND t.site_published = true
        AND coalesce(t.day_of_page_enabled, true) = true
        AND coalesce(t.day_of_page_mode, 'live') = 'live'
    )
  ORDER BY group_position NULLS LAST
  LIMIT 1;

  IF r.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF r.group_number IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'first_name', first_name,
        'last_name', last_name,
        'group_number', group_number,
        'group_position', group_position,
        'scoring_code', scoring_code,
        'group_scoring_code', group_scoring_code
      ) ORDER BY group_position NULLS LAST
    ), '[]'::jsonb)
    INTO grp
    FROM public.tournament_registrations
    WHERE tournament_id = _tournament_id AND group_number = r.group_number;
  ELSE
    grp := '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object('name', name, 'total', total) ORDER BY total ASC), '[]'::jsonb)
  INTO leaders
  FROM (
    SELECT (rg.first_name || ' ' || rg.last_name) AS name, sum(s.strokes)::int AS total
    FROM public.tournament_scores s
    JOIN public.tournament_registrations rg ON rg.id = s.registration_id
    WHERE s.tournament_id = _tournament_id
    GROUP BY rg.id, rg.first_name, rg.last_name
    ORDER BY total ASC
    LIMIT 10
  ) x;

  RETURN jsonb_build_object('player', to_jsonb(r), 'group', grp, 'leaders', leaders);
END $function$;

CREATE OR REPLACE FUNCTION public.live_scoring_lookup_group(_tournament_id uuid, _scoring_code text, _email text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT group_number FROM public.tournament_registrations
  WHERE tournament_id = _tournament_id
    AND group_number IS NOT NULL
    AND (
      (_scoring_code IS NOT NULL AND group_scoring_code IS NOT NULL AND upper(group_scoring_code) = upper(_scoring_code))
      OR (_scoring_code IS NOT NULL AND scoring_code IS NOT NULL AND upper(scoring_code) = upper(_scoring_code))
      OR (_email IS NOT NULL AND email IS NOT NULL AND lower(email) = lower(_email))
    )
  LIMIT 1;
$function$;