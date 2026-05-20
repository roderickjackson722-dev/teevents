DROP POLICY IF EXISTS "Public can submit registrations" ON public.college_tournament_registrations;
CREATE POLICY "Public can submit registrations"
ON public.college_tournament_registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);