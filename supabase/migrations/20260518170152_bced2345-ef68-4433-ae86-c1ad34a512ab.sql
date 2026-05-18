
-- Drop the views we just added; switch to column-level grants instead.
DROP VIEW IF EXISTS public.auctions_public;
DROP VIEW IF EXISTS public.raffles_public;
DROP VIEW IF EXISTS public.tournament_donations_public;

-- Re-add public read policies (RLS row gate), but lock columns via GRANTs.
CREATE POLICY "Anyone can view auctions"
ON public.auctions FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can view raffles"
ON public.raffles FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Public can view donations for published tournaments"
ON public.tournament_donations FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.tournaments t
  WHERE t.id = tournament_donations.tournament_id AND t.site_published = true
));

-- Column-level grants: revoke broad SELECT, grant only non-PII columns to anon/authenticated.
REVOKE SELECT ON public.auctions FROM anon, authenticated;
GRANT SELECT (
  id, tournament_id, item_name, description, images,
  starting_bid_cents, current_bid_cents, minimum_increment_cents,
  buy_now_cents, status, start_time, end_time, auto_extend_minutes,
  winning_bidder_name, winning_bid_amount_cents,
  created_at, updated_at
) ON public.auctions TO anon, authenticated;
-- Org members still need full row access via service_role/postgres-owned policies;
-- grant full table SELECT back to authenticated through a separate path: we re-grant
-- all columns to authenticated since the existing manage policy already gates by org.
GRANT SELECT ON public.auctions TO authenticated;
-- Above grant overrides column restriction for authenticated. We need anon-only restriction.
REVOKE SELECT ON public.auctions FROM authenticated;
GRANT SELECT ON public.auctions TO authenticated;
-- Net: anon = column-restricted, authenticated = full (RLS still applies).
-- Re-apply restricted columns to anon:
REVOKE SELECT ON public.auctions FROM anon;
GRANT SELECT (
  id, tournament_id, item_name, description, images,
  starting_bid_cents, current_bid_cents, minimum_increment_cents,
  buy_now_cents, status, start_time, end_time, auto_extend_minutes,
  winning_bidder_name, winning_bid_amount_cents,
  created_at, updated_at
) ON public.auctions TO anon;

REVOKE SELECT ON public.raffles FROM anon;
GRANT SELECT (
  id, tournament_id, item_name, description, images,
  ticket_price_cents, max_tickets, tickets_sold,
  draw_time, status, winner_ticket_number, winner_name,
  created_at, updated_at
) ON public.raffles TO anon;

REVOKE SELECT ON public.tournament_donations FROM anon;
GRANT SELECT (
  id, tournament_id, amount_cents, status, created_at
) ON public.tournament_donations TO anon;
