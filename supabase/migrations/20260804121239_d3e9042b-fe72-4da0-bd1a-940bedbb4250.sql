-- 1) College roster submissions: tie the insert to a freshly created registration
-- for a tournament that is still open, instead of "any registration that exists".
DROP POLICY IF EXISTS "Public can submit college players" ON public.college_tournament_players;

CREATE POLICY "Public can submit college players"
ON public.college_tournament_players
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.college_tournament_registrations r
    JOIN public.college_tournaments ct ON ct.id = r.tournament_id
    WHERE r.id = college_tournament_players.registration_id
      AND ct.registration_open = true
      -- roster rows are submitted immediately after the registration is created;
      -- this window blocks later enumeration of other schools' registration ids
      AND r.created_at > (now() - interval '30 minutes')
  )
);

-- 2) Auction bids: only allow bids on items that are still active.
DROP POLICY IF EXISTS "Public can place validated bids" ON public.tournament_auction_bids;

CREATE POLICY "Public can place validated bids"
ON public.tournament_auction_bids
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tournament_auction_items ai
    WHERE ai.id = tournament_auction_bids.item_id
      AND ai.is_active = true
  )
  AND char_length(bidder_name) >= 1
  AND char_length(bidder_name) <= 200
  AND bidder_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND char_length(bidder_email) <= 254
  AND (bidder_phone IS NULL OR char_length(bidder_phone) <= 50)
  AND amount > 0
  AND amount <= 1000000
);