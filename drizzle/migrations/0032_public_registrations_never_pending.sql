DROP POLICY IF EXISTS "Anyone can register for published tournaments" ON public.tournament_registrations;
CREATE POLICY "Anyone can register for published tournaments"
ON public.tournament_registrations FOR INSERT TO public
WITH CHECK (
  payment_status IS DISTINCT FROM 'pending'
  AND EXISTS (SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_registrations.tournament_id AND t.registration_open = true AND t.site_published = true)
);