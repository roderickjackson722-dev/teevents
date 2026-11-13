CREATE OR REPLACE FUNCTION public.live_scoring_code_for_email(_tournament_id uuid, _email text)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COALESCE(NULLIF(btrim(r.group_scoring_code), ''), NULLIF(btrim(r.scoring_code), ''))
  FROM public.tournament_registrations r
  JOIN public.tournaments t ON t.id = r.tournament_id
  WHERE r.tournament_id = _tournament_id
    AND COALESCE(t.live_scoring_allow_email_login, false) = true
    AND auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
                AND lower(u.email) = lower(btrim(_email)))
    AND r.email IS NOT NULL AND lower(r.email) = lower(btrim(_email))
    AND r.group_number IS NOT NULL
  ORDER BY (r.group_scoring_code IS NOT NULL) DESC, r.created_at
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.live_scoring_lookup_group(_tournament_id uuid, _scoring_code text, _email text)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT group_number FROM public.tournament_registrations
  WHERE tournament_id = _tournament_id
    AND group_number IS NOT NULL
    AND (
      (_scoring_code IS NOT NULL AND group_scoring_code IS NOT NULL AND upper(group_scoring_code) = upper(_scoring_code))
      OR (_scoring_code IS NOT NULL AND scoring_code IS NOT NULL AND upper(scoring_code) = upper(_scoring_code))
      OR (_email IS NOT NULL AND email IS NOT NULL AND lower(email) = lower(_email)
          AND auth.uid() IS NOT NULL
          AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
                      AND lower(u.email) = lower(btrim(_email))))
    )
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.lookup_league_member_code_by_email(_league_id uuid, _email text)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT m.scoring_code
  FROM public.league_members m
  WHERE m.league_id = _league_id
    AND auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
                AND lower(u.email) = lower(trim(_email)))
    AND lower(trim(m.email)) = lower(trim(_email))
  LIMIT 1
$function$;