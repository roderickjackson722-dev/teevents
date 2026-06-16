-- Fix: any authenticated user can insert into admin_notifications
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.admin_notifications;
-- Notifications are written by edge functions via service role (which bypasses RLS).

-- Fix: vendor_booth_locations leaks data for unpublished tournaments
DROP POLICY IF EXISTS "Public can view booth locations" ON public.vendor_booth_locations;
CREATE POLICY "Public can view booth locations for published tournaments"
ON public.vendor_booth_locations FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = vendor_booth_locations.tournament_id
      AND t.site_published = true
  )
);

-- Same fix for tournament_contests
DROP POLICY IF EXISTS "Public can view active contests" ON public.tournament_contests;
CREATE POLICY "Public can view active contests for published tournaments"
ON public.tournament_contests FOR SELECT TO public
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_contests.tournament_id
      AND t.site_published = true
  )
);

-- Same fix for tournament_accommodations
DROP POLICY IF EXISTS "Public can view active accommodations" ON public.tournament_accommodations;
CREATE POLICY "Public can view active accommodations for published tournaments"
ON public.tournament_accommodations FOR SELECT TO public
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_accommodations.tournament_id
      AND t.site_published = true
  )
);

-- Same fix for side_events
DROP POLICY IF EXISTS "Public can view active public side events" ON public.side_events;
CREATE POLICY "Public can view active side events for published tournaments"
ON public.side_events FOR SELECT TO public
USING (
  is_active = true
  AND show_on_public = true
  AND EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = side_events.tournament_id
      AND t.site_published = true
  )
);