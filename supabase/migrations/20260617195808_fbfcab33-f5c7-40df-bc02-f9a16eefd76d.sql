
REVOKE SELECT ON public.auctions FROM anon;
GRANT SELECT (
  id, tournament_id, item_name, description, images,
  starting_bid_cents, current_bid_cents, minimum_increment_cents,
  buy_now_cents, status, start_time, end_time, auto_extend_minutes,
  winning_bidder_name, winning_bid_amount_cents, winner_notified_at,
  created_at, updated_at
) ON public.auctions TO anon;

REVOKE SELECT ON public.raffles FROM anon;
GRANT SELECT (
  id, tournament_id, item_name, description, images,
  ticket_price_cents, max_tickets, tickets_sold, draw_time, status,
  winner_ticket_number, winner_name, created_at, updated_at
) ON public.raffles TO anon;

DROP POLICY IF EXISTS "Public can view donations for published tournaments" ON public.tournament_donations;
CREATE POLICY "Public can view donation totals for published tournaments"
ON public.tournament_donations
FOR SELECT
TO anon
USING (EXISTS (
  SELECT 1 FROM public.tournaments t
  WHERE t.id = tournament_donations.tournament_id AND t.site_published = true
));
REVOKE SELECT ON public.tournament_donations FROM anon;
GRANT SELECT (id, tournament_id, amount_cents, status, created_at) ON public.tournament_donations TO anon;

DROP POLICY IF EXISTS "Public can read active promoters by code" ON public.team_promoters;
CREATE POLICY "Public can read active promoter referral codes"
ON public.team_promoters
FOR SELECT
TO anon
USING (is_active = true);
REVOKE SELECT ON public.team_promoters FROM anon;
GRANT SELECT (id, tournament_id, unique_ref_code, is_active, role) ON public.team_promoters TO anon;

REVOKE SELECT ON public.demo_players FROM anon;
GRANT SELECT (
  id, demo_tournament_id, name, group_name, handicap, shirt_size, tee_time, created_at
) ON public.demo_players TO anon;

ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
UPDATE public.platform_settings SET is_public = true WHERE key IN ('enable_group_trips');

DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;

CREATE POLICY "Public can read public platform settings"
ON public.platform_settings
FOR SELECT
TO anon
USING (is_public = true);

CREATE POLICY "Authenticated can read platform settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (true);
