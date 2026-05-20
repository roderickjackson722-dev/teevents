CREATE OR REPLACE FUNCTION public.college_tournament_accepts_registration(_tournament_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.college_tournaments
    WHERE id = _tournament_id AND registration_open = true
  )
$$;

DROP POLICY IF EXISTS "Public can submit registrations" ON public.college_tournament_registrations;

CREATE POLICY "Public can submit registrations"
ON public.college_tournament_registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (public.college_tournament_accepts_registration(tournament_id));

-- Also fix players insert in case it has the same problem
DROP POLICY IF EXISTS "Public can submit college players" ON public.college_tournament_players;

CREATE POLICY "Public can submit college players"
ON public.college_tournament_players
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.college_tournament_registrations r
    WHERE r.id = registration_id
  )
);