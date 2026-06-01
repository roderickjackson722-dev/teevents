DROP POLICY IF EXISTS "Public can view day-of registrants by scoring code" ON public.tournament_registrations;
DROP POLICY IF EXISTS "Public can view day-of group members" ON public.tournament_registrations;

CREATE POLICY "Public can view day-of registrants by scoring code"
ON public.tournament_registrations
FOR SELECT
TO anon
USING (
  scoring_code IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.tournaments t
    WHERE t.id = tournament_registrations.tournament_id
      AND t.site_published = true
      AND t.day_of_page_enabled = true
      AND t.day_of_page_mode = 'live'
  )
);

CREATE POLICY "Public can view day-of group members"
ON public.tournament_registrations
FOR SELECT
TO anon
USING (
  group_number IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.tournaments t
    WHERE t.id = tournament_registrations.tournament_id
      AND t.site_published = true
      AND t.day_of_page_enabled = true
      AND t.day_of_page_mode = 'live'
  )
);