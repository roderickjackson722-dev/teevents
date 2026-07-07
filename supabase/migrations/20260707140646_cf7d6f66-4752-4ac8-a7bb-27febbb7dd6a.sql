
-- ============================================================
-- 1) auction_bids: restrict public inserts to active auctions
-- ============================================================
DROP POLICY IF EXISTS "Anyone can insert bids" ON public.auction_bids;

CREATE POLICY "Public can insert bids on active auctions"
  ON public.auction_bids
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.auctions a
      WHERE a.id = auction_bids.auction_id
        AND a.status = 'active'
        AND (a.end_time IS NULL OR a.end_time > now())
    )
    AND char_length(bidder_name) BETWEEN 1 AND 200
    AND bidder_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(bidder_email) <= 254
    AND (bidder_phone IS NULL OR char_length(bidder_phone) <= 50)
    AND bid_amount_cents > 0
    AND bid_amount_cents <= 100000000
  );

-- ============================================================
-- 2) college_tournament_players: remove public read
--    (admins already have an ALL policy that covers SELECT)
-- ============================================================
DROP POLICY IF EXISTS "Public can view players" ON public.college_tournament_players;

-- ============================================================
-- 3) event_resources: drop overly-permissive read policies
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read event resources" ON public.event_resources;
DROP POLICY IF EXISTS "Authenticated users can read event resources" ON public.event_resources;

-- ============================================================
-- 4/5) sponsor_registrations & vendor_registrations
-- ============================================================
DROP POLICY IF EXISTS "Public can view approved sponsor registrations" ON public.sponsor_registrations;
DROP POLICY IF EXISTS "Public can view approved vendor registrations" ON public.vendor_registrations;

CREATE OR REPLACE VIEW public.public_sponsor_registrations AS
SELECT
  id,
  tournament_id,
  tier_id,
  company_name,
  website_url,
  description,
  logo_url,
  payment_status,
  manually_approved,
  show_on_public,
  is_title_sponsor
FROM public.sponsor_registrations
WHERE show_on_public = true
  AND (payment_status = 'paid' OR manually_approved = true);

GRANT SELECT ON public.public_sponsor_registrations TO anon, authenticated;

CREATE OR REPLACE VIEW public.public_vendor_registrations AS
SELECT
  id,
  tournament_id,
  tier_id,
  vendor_name,
  company_name,
  website_url,
  description,
  logo_url,
  business_type,
  booth_location,
  payment_status,
  manually_approved,
  show_on_public
FROM public.vendor_registrations
WHERE show_on_public = true
  AND (payment_status = 'paid' OR manually_approved = true);

GRANT SELECT ON public.public_vendor_registrations TO anon, authenticated;
