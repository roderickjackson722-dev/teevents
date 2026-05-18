
DROP POLICY IF EXISTS "Anyone can view auctions" ON public.auctions;

CREATE OR REPLACE VIEW public.auctions_public AS
SELECT
  id, tournament_id, item_name, description, images,
  starting_bid_cents, current_bid_cents, minimum_increment_cents,
  buy_now_cents, status, start_time, end_time, auto_extend_minutes,
  winning_bidder_name, winning_bid_amount_cents,
  created_at, updated_at
FROM public.auctions;
GRANT SELECT ON public.auctions_public TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view verified bids" ON public.auction_bids;

DROP POLICY IF EXISTS "Anyone can view raffles" ON public.raffles;

CREATE OR REPLACE VIEW public.raffles_public AS
SELECT
  id, tournament_id, item_name AS prize_name, description, images,
  ticket_price_cents, max_tickets, tickets_sold,
  draw_time, status, winner_ticket_number, winner_name,
  created_at, updated_at
FROM public.raffles;
GRANT SELECT ON public.raffles_public TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view donations for published tournaments" ON public.tournament_donations;

CREATE OR REPLACE VIEW public.tournament_donations_public AS
SELECT d.id, d.tournament_id, d.amount_cents, d.status, d.created_at
FROM public.tournament_donations d
JOIN public.tournaments t ON t.id = d.tournament_id
WHERE t.site_published = true;
GRANT SELECT ON public.tournament_donations_public TO anon, authenticated;

DROP POLICY IF EXISTS "Service role can update orders" ON public.director_shop_orders;
CREATE POLICY "Service role can update orders"
ON public.director_shop_orders
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.org_members;
CREATE POLICY "First owner can self-insert"
ON public.org_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'owner'
  AND NOT EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.organization_id = org_members.organization_id
  )
);

DROP POLICY IF EXISTS "Organizers can read vendor documents" ON storage.objects;
DROP POLICY IF EXISTS "Organizers can delete vendor documents" ON storage.objects;

CREATE POLICY "Org members can read vendor documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'vendor-documents'
  AND EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE (t.id)::text = (storage.foldername(objects.name))[1]
      AND public.is_org_member(auth.uid(), t.organization_id)
  )
);

CREATE POLICY "Org members can delete vendor documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'vendor-documents'
  AND EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE (t.id)::text = (storage.foldername(objects.name))[1]
      AND public.is_org_member(auth.uid(), t.organization_id)
  )
);
