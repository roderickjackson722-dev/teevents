
-- 1. Hide prospect PII columns from anon on demo_tournaments & sample_tournaments
REVOKE SELECT (prospect_email, prospect_name) ON public.demo_tournaments FROM anon;
REVOKE SELECT (prospect_name, prospect_email, prospect_company, prospect_source, crm_notes, crm_status, last_contacted_at) ON public.sample_tournaments FROM anon;

-- 2. media_clips: require parent tournament to be published
DROP POLICY IF EXISTS "Anyone can view active media clips" ON public.media_clips;
CREATE POLICY "Public can view active media clips for published tournaments"
  ON public.media_clips
  FOR SELECT
  TO public
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = media_clips.tournament_id AND t.site_published = true
    )
  );

-- 3. sponsorship_tiers: require parent tournament to be published for public read
DROP POLICY IF EXISTS "Anyone can view active sponsorship tiers" ON public.sponsorship_tiers;
CREATE POLICY "Public can view active sponsorship tiers for published tournaments"
  ON public.sponsorship_tiers
  FOR SELECT
  TO public
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = sponsorship_tiers.tournament_id AND t.site_published = true
    )
  );

-- 4. vendor_tiers: require parent tournament to be published for public read
DROP POLICY IF EXISTS "Anyone can view active vendor tiers" ON public.vendor_tiers;
CREATE POLICY "Public can view active vendor tiers for published tournaments"
  ON public.vendor_tiers
  FOR SELECT
  TO public
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = vendor_tiers.tournament_id AND t.site_published = true
    )
  );

-- 5. tournament_contests: drop overly-broad authenticated policy
DROP POLICY IF EXISTS "Authenticated can view active contests" ON public.tournament_contests;
