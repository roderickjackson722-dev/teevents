
-- AUCTIONS: restrict anon to non-PII columns
REVOKE SELECT ON public.auctions FROM anon;
GRANT SELECT (
  id, tournament_id, item_name, description, images,
  starting_bid_cents, current_bid_cents, minimum_increment_cents, buy_now_cents,
  start_time, end_time, auto_extend_minutes, status,
  winning_bid_amount_cents, winner_notified_at, created_at, updated_at
) ON public.auctions TO anon;

-- RAFFLES
REVOKE SELECT ON public.raffles FROM anon;
GRANT SELECT (
  id, tournament_id, item_name, description, images,
  ticket_price_cents, max_tickets, tickets_sold, draw_time,
  winner_ticket_number, winner_notified_at, status, created_at, updated_at
) ON public.raffles TO anon;

-- TOURNAMENT_DONATIONS
REVOKE SELECT ON public.tournament_donations FROM anon;
GRANT SELECT (
  id, tournament_id, amount_cents, status, created_at
) ON public.tournament_donations TO anon;

-- TOURNAMENT_AUCTION_ITEMS
REVOKE SELECT ON public.tournament_auction_items FROM anon;
GRANT SELECT (
  id, tournament_id, title, description, image_url, type,
  starting_bid, current_bid, buy_now_price, raffle_ticket_price,
  is_active, sort_order, created_at
) ON public.tournament_auction_items TO anon;

-- SPONSOR_REGISTRATIONS
REVOKE SELECT ON public.sponsor_registrations FROM anon;
GRANT SELECT (
  id, tournament_id, tier_id, company_name, website_url, description,
  logo_url, show_on_public, payment_status, manually_approved, created_at
) ON public.sponsor_registrations TO anon;

-- VENDOR_REGISTRATIONS
REVOKE SELECT ON public.vendor_registrations FROM anon;
GRANT SELECT (
  id, tournament_id, tier_id, vendor_name, company_name, business_type,
  booth_location, logo_url, website_url, description, show_on_public,
  payment_status, status, manually_approved, created_at
) ON public.vendor_registrations TO anon;

-- TEAM_PROMOTERS
REVOKE SELECT ON public.team_promoters FROM anon;
GRANT SELECT (
  id, tournament_id, name, role, unique_ref_code, is_active, created_at, updated_at
) ON public.team_promoters TO anon;

-- VENDOR DOCUMENTS: tighten public INSERT to require {tournamentId}/vendor-registrations/<file>
DROP POLICY IF EXISTS "Public can upload vendor documents" ON storage.objects;
CREATE POLICY "Public can upload vendor documents"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'vendor-documents'
  AND (storage.foldername(name))[2] = 'vendor-registrations'
  AND array_length(storage.foldername(name), 1) >= 2
  AND EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id::text = (storage.foldername(name))[1]
  )
);
