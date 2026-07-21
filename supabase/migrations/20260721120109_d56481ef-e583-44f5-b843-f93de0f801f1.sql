
-- 1) demo_players: hide email from anon via column-level grants
REVOKE SELECT ON public.demo_players FROM anon;
GRANT SELECT (id, demo_tournament_id, name, handicap, shirt_size, group_name, tee_time, created_at) ON public.demo_players TO anon;
-- authenticated retains full access (admin manage policy handles writes)
REVOKE SELECT ON public.demo_players FROM authenticated;
GRANT SELECT (id, demo_tournament_id, name, handicap, shirt_size, group_name, tee_time, created_at) ON public.demo_players TO authenticated;

-- 2) platform_settings: authenticated read only for is_public rows; admins keep read via has_role
DROP POLICY IF EXISTS "Authenticated can read platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated can read public platform settings"
  ON public.platform_settings FOR SELECT
  TO authenticated
  USING (is_public = true OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3) media_clips: add explicit approval flag decoupled from is_active/site_published
ALTER TABLE public.media_clips ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;
DROP POLICY IF EXISTS "Public can view active media clips for published tournaments" ON public.media_clips;
CREATE POLICY "Public can view published media clips"
  ON public.media_clips FOR SELECT
  USING (
    is_active = true
    AND is_published = true
    AND EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = media_clips.tournament_id AND t.site_published = true)
  );

-- 4) sponsorship_tiers / vendor_tiers / tournament_contests: add published_to_public flag
ALTER TABLE public.sponsorship_tiers ADD COLUMN IF NOT EXISTS published_to_public boolean NOT NULL DEFAULT true;
ALTER TABLE public.vendor_tiers ADD COLUMN IF NOT EXISTS published_to_public boolean NOT NULL DEFAULT true;
ALTER TABLE public.tournament_contests ADD COLUMN IF NOT EXISTS published_to_public boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Public can view active sponsorship tiers for published tourname" ON public.sponsorship_tiers;
CREATE POLICY "Public can view published sponsorship tiers"
  ON public.sponsorship_tiers FOR SELECT
  USING (
    is_active = true
    AND published_to_public = true
    AND EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = sponsorship_tiers.tournament_id AND t.site_published = true)
  );

DROP POLICY IF EXISTS "Public can view active vendor tiers for published tournaments" ON public.vendor_tiers;
CREATE POLICY "Public can view published vendor tiers"
  ON public.vendor_tiers FOR SELECT
  USING (
    is_active = true
    AND published_to_public = true
    AND EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = vendor_tiers.tournament_id AND t.site_published = true)
  );

DROP POLICY IF EXISTS "Public can view active contests for published tournaments" ON public.tournament_contests;
CREATE POLICY "Public can view published contests"
  ON public.tournament_contests FOR SELECT
  USING (
    is_active = true
    AND published_to_public = true
    AND EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_contests.tournament_id AND t.site_published = true)
  );
