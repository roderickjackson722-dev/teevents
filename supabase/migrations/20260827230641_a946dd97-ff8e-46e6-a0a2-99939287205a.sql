GRANT SELECT, INSERT, UPDATE, DELETE ON public.auctions TO authenticated;
GRANT ALL ON public.auctions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_promoters TO authenticated;
GRANT ALL ON public.team_promoters TO service_role;

CREATE OR REPLACE FUNCTION public.college_player_insert_allowed(_registration_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.college_tournament_registrations r
    JOIN public.college_tournaments ct ON ct.id = r.tournament_id
    WHERE r.id = _registration_id
      AND ct.registration_open = true
      AND r.created_at > now() - interval '2 hours'
  )
$$;

REVOKE ALL ON FUNCTION public.college_player_insert_allowed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.college_player_insert_allowed(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public can submit college players" ON public.college_tournament_players;
CREATE POLICY "Public can submit college players"
ON public.college_tournament_players
FOR INSERT
TO anon, authenticated
WITH CHECK (public.college_player_insert_allowed(registration_id));