CREATE OR REPLACE FUNCTION public.live_scoring_code_for_email(_tournament_id uuid, _email text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(btrim(r.group_scoring_code), ''), NULLIF(btrim(r.scoring_code), ''))
  FROM public.tournament_registrations r
  JOIN public.tournaments t ON t.id = r.tournament_id
  WHERE r.tournament_id = _tournament_id
    AND COALESCE(t.live_scoring_allow_email_login, false) = true
    AND _email IS NOT NULL AND length(btrim(_email)) > 3
    AND r.email IS NOT NULL AND lower(r.email) = lower(btrim(_email))
    AND r.group_number IS NOT NULL
  ORDER BY (r.group_scoring_code IS NOT NULL) DESC, r.created_at
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.live_scoring_code_for_email(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_scoring_code_for_email(uuid, text) TO anon, authenticated, service_role;