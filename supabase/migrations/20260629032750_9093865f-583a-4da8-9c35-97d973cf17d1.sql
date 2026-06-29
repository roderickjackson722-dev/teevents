-- =========================================================================
-- AUCTIONS — remove anon access to base table, expose safe view instead
-- =========================================================================
DROP POLICY IF EXISTS "Anyone can view auctions" ON public.auctions;
CREATE POLICY "Authenticated can view auctions"
  ON public.auctions FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.auctions FROM anon;

CREATE OR REPLACE VIEW public.public_auctions
WITH (security_invoker = false) AS
SELECT
  a.id, a.tournament_id, a.item_name, a.description, a.images,
  a.starting_bid_cents, a.current_bid_cents, a.minimum_increment_cents,
  a.buy_now_cents, a.status, a.start_time, a.end_time,
  a.auto_extend_minutes, a.winning_bidder_name, a.winning_bid_amount_cents,
  a.created_at, a.updated_at
FROM public.auctions a
JOIN public.tournaments t ON t.id = a.tournament_id
WHERE t.site_published = true;

GRANT SELECT ON public.public_auctions TO anon, authenticated;

-- =========================================================================
-- RAFFLES
-- =========================================================================
DROP POLICY IF EXISTS "Anyone can view raffles" ON public.raffles;
CREATE POLICY "Authenticated can view raffles"
  ON public.raffles FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.raffles FROM anon;

CREATE OR REPLACE VIEW public.public_raffles
WITH (security_invoker = false) AS
SELECT
  r.id, r.tournament_id, r.item_name, r.description, r.images,
  r.ticket_price_cents, r.max_tickets, r.tickets_sold, r.draw_time,
  r.status, r.winner_ticket_number, r.winner_name,
  r.created_at, r.updated_at
FROM public.raffles r
JOIN public.tournaments t ON t.id = r.tournament_id
WHERE t.site_published = true;

GRANT SELECT ON public.public_raffles TO anon, authenticated;

-- =========================================================================
-- TOURNAMENT_DONATIONS — drop the anon policy, expose totals view only
-- =========================================================================
DROP POLICY IF EXISTS "Public can view donation totals for published tournaments"
  ON public.tournament_donations;

REVOKE SELECT ON public.tournament_donations FROM anon;

CREATE OR REPLACE VIEW public.public_donation_totals
WITH (security_invoker = false) AS
SELECT
  d.id, d.tournament_id, d.amount_cents, d.status, d.created_at
FROM public.tournament_donations d
JOIN public.tournaments t ON t.id = d.tournament_id
WHERE t.site_published = true
  AND d.status = 'completed';

GRANT SELECT ON public.public_donation_totals TO anon, authenticated;

-- =========================================================================
-- TEAM_PROMOTERS — remove anon access, expose safe ref-code view only
-- =========================================================================
DROP POLICY IF EXISTS "Public can read active promoter referral codes"
  ON public.team_promoters;

REVOKE SELECT ON public.team_promoters FROM anon;

CREATE OR REPLACE VIEW public.public_team_promoters
WITH (security_invoker = false) AS
SELECT
  p.id, p.tournament_id, p.unique_ref_code, p.is_active, p.created_at
FROM public.team_promoters p
WHERE p.is_active = true;

GRANT SELECT ON public.public_team_promoters TO anon, authenticated;
