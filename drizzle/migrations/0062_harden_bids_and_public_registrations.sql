DROP POLICY IF EXISTS "Public can insert bids on active auctions" ON public.auction_bids;
CREATE POLICY "Public can insert bids on active auctions" ON public.auction_bids FOR INSERT TO anon, authenticated
WITH CHECK ((verified IS NOT TRUE) AND (EXISTS (SELECT 1 FROM public.auctions a WHERE a.id = auction_bids.auction_id AND a.status = 'active' AND (a.end_time IS NULL OR a.end_time > now()))) AND char_length(bidder_name) BETWEEN 1 AND 200 AND bidder_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND char_length(bidder_email) <= 254 AND (bidder_phone IS NULL OR char_length(bidder_phone) <= 50) AND bid_amount_cents > 0 AND bid_amount_cents <= 100000000);

DROP POLICY IF EXISTS "Anyone can register for published tournaments" ON public.tournament_registrations;
CREATE POLICY "Anyone can register for published tournaments" ON public.tournament_registrations FOR INSERT TO public
WITH CHECK (payment_status = 'walkup' AND EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_registrations.tournament_id AND t.registration_open = true AND t.site_published = true));