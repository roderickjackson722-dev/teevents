-- Remove the views — they triggered "Security Definer View" lints.
DROP VIEW IF EXISTS public.public_auctions;
DROP VIEW IF EXISTS public.public_raffles;
DROP VIEW IF EXISTS public.public_donation_totals;
DROP VIEW IF EXISTS public.public_team_promoters;

-- =========================================================================
-- AUCTIONS — narrow anon SELECT, hide PII columns
-- =========================================================================
CREATE POLICY "Anon can view auctions for published tournaments"
  ON public.auctions FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = auctions.tournament_id AND t.site_published = true
  ));

GRANT SELECT (
  id, tournament_id, item_name, description, images,
  starting_bid_cents, current_bid_cents, minimum_increment_cents,
  buy_now_cents, status, start_time, end_time, auto_extend_minutes,
  winning_bidder_name, winning_bid_amount_cents, created_at, updated_at
) ON public.auctions TO anon;

-- =========================================================================
-- RAFFLES
-- =========================================================================
CREATE POLICY "Anon can view raffles for published tournaments"
  ON public.raffles FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = raffles.tournament_id AND t.site_published = true
  ));

GRANT SELECT (
  id, tournament_id, item_name, description, images,
  ticket_price_cents, max_tickets, tickets_sold, draw_time,
  status, winner_ticket_number, winner_name,
  created_at, updated_at
) ON public.raffles TO anon;

-- =========================================================================
-- TOURNAMENT_DONATIONS — narrow anon SELECT (completed + published), safe cols
-- =========================================================================
CREATE POLICY "Anon can view donation totals for published tournaments"
  ON public.tournament_donations FOR SELECT
  TO anon
  USING (
    status = 'completed'
    AND EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_donations.tournament_id AND t.site_published = true
    )
  );

GRANT SELECT (id, tournament_id, amount_cents, status, created_at)
  ON public.tournament_donations TO anon;

-- =========================================================================
-- TEAM_PROMOTERS — narrow anon SELECT (only ref-code/active columns)
-- =========================================================================
CREATE POLICY "Anon can view active promoter ref codes"
  ON public.team_promoters FOR SELECT
  TO anon
  USING (is_active = true);

GRANT SELECT (id, tournament_id, unique_ref_code, is_active, created_at)
  ON public.team_promoters TO anon;
