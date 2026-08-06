CREATE OR REPLACE FUNCTION public.get_public_team_roster(_tournament_id uuid)
RETURNS TABLE(
  registration_id uuid,
  first_name text,
  last_name text,
  group_number integer,
  group_position integer,
  team_name text,
  tee_time text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.id,
         r.first_name,
         r.last_name,
         r.group_number,
         r.group_position,
         COALESCE(
           NULLIF(btrim(rgn.team_name), ''),
           NULLIF(btrim(rgn.group_name), ''),
           NULLIF(btrim(rg.team_name), ''),
           NULLIF(btrim(rg.group_name), ''),
           NULLIF(btrim(r.group_label), '')
         ) AS team_name,
         COALESCE(NULLIF(btrim(r.tee_time::text), ''), NULLIF(btrim(rgn.tee_time::text), ''), NULLIF(btrim(rg.tee_time::text), '')) AS tee_time
  FROM public.tournament_registrations r
  LEFT JOIN public.registration_groups rg ON rg.id = r.group_id
  LEFT JOIN public.registration_groups rgn
    ON rgn.tournament_id = r.tournament_id
   AND rgn.group_number IS NOT NULL
   AND rgn.group_number = r.group_number
  JOIN public.tournaments t ON t.id = r.tournament_id
  WHERE r.tournament_id = _tournament_id
    AND t.site_published = true
    AND lower(coalesce(r.payment_status, '')) = 'paid';
$$;

GRANT EXECUTE ON FUNCTION public.get_public_team_roster(uuid) TO anon, authenticated;