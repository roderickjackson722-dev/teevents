DROP POLICY IF EXISTS "Public can submit registrations" ON public.college_tournament_registrations;
CREATE POLICY "Public can submit registrations"
ON public.college_tournament_registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (public.college_tournament_accepts_registration(tournament_id));

-- Clean up the test rows from debugging
DELETE FROM public.college_tournament_registrations
WHERE school_name = 'Test U' AND coach_email = 't@t.com';