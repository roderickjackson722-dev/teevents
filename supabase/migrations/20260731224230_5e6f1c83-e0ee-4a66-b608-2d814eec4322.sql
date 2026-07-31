CREATE OR REPLACE FUNCTION public.lookup_league_member_code_by_email(_league_id uuid, _email text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.scoring_code
  FROM public.league_members m
  WHERE m.league_id = _league_id
    AND lower(trim(m.email)) = lower(trim(_email))
  LIMIT 1
$function$;

GRANT EXECUTE ON FUNCTION public.lookup_league_member_code_by_email(uuid, text) TO anon, authenticated;