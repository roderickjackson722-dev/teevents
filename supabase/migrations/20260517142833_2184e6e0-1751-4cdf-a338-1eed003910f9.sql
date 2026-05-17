
-- Tab title columns on tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS auction_tab_title TEXT DEFAULT 'Auction',
  ADD COLUMN IF NOT EXISTS raffle_tab_title TEXT DEFAULT 'Raffle';

-- Auctions
CREATE TABLE public.auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  starting_bid_cents INTEGER NOT NULL DEFAULT 0,
  current_bid_cents INTEGER,
  minimum_increment_cents INTEGER NOT NULL DEFAULT 100,
  buy_now_cents INTEGER,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  auto_extend_minutes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  winning_bidder_name TEXT,
  winning_bidder_email TEXT,
  winning_bid_amount_cents INTEGER,
  winner_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auctions_tournament ON public.auctions(tournament_id);
CREATE INDEX idx_auctions_status_end ON public.auctions(status, end_time);

CREATE TABLE public.auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_name TEXT NOT NULL,
  bidder_email TEXT NOT NULL,
  bidder_phone TEXT,
  bid_amount_cents INTEGER NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  verify_token UUID NOT NULL DEFAULT gen_random_uuid(),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auction_bids_auction ON public.auction_bids(auction_id, bid_amount_cents DESC);
CREATE INDEX idx_auction_bids_token ON public.auction_bids(verify_token);

-- Raffles
CREATE TABLE public.raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  ticket_price_cents INTEGER NOT NULL,
  max_tickets INTEGER,
  tickets_sold INTEGER NOT NULL DEFAULT 0,
  draw_time TIMESTAMPTZ,
  winner_ticket_number INTEGER,
  winner_name TEXT,
  winner_email TEXT,
  winner_notified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_raffles_tournament ON public.raffles(tournament_id);
CREATE INDEX idx_raffles_status_draw ON public.raffles(status, draw_time);

CREATE TABLE public.raffle_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  ticket_number INTEGER NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT,
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (raffle_id, ticket_number)
);
CREATE INDEX idx_raffle_tickets_raffle ON public.raffle_tickets(raffle_id);

-- Timestamp triggers
CREATE TRIGGER auctions_updated_at BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER raffles_updated_at BEFORE UPDATE ON public.raffles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_tickets ENABLE ROW LEVEL SECURITY;

-- Auctions policies
CREATE POLICY "Anyone can view auctions" ON public.auctions
  FOR SELECT USING (true);
CREATE POLICY "Org members manage auctions" ON public.auctions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = auctions.tournament_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = auctions.tournament_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
  );

-- Auction bids: anyone can insert (server validates), public can read verified bids, organizers see all
CREATE POLICY "Anyone can insert bids" ON public.auction_bids
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view verified bids" ON public.auction_bids
  FOR SELECT USING (verified = true);
CREATE POLICY "Org members view all bids" ON public.auction_bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.auctions a
      JOIN public.tournaments t ON t.id = a.tournament_id
      WHERE a.id = auction_bids.auction_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
  );
CREATE POLICY "Org members manage bids" ON public.auction_bids
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.auctions a
      JOIN public.tournaments t ON t.id = a.tournament_id
      WHERE a.id = auction_bids.auction_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
  );

-- Raffles
CREATE POLICY "Anyone can view raffles" ON public.raffles
  FOR SELECT USING (true);
CREATE POLICY "Org members manage raffles" ON public.raffles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = raffles.tournament_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = raffles.tournament_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
  );

-- Raffle tickets: organizers view all; public cannot view (privacy)
CREATE POLICY "Org members view tickets" ON public.raffle_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.raffles r
      JOIN public.tournaments t ON t.id = r.tournament_id
      WHERE r.id = raffle_tickets.raffle_id
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
  );
-- Inserts/updates are done by edge functions with service role; no public policy needed
