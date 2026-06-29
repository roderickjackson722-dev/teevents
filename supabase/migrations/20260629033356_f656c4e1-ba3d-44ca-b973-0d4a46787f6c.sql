DROP POLICY IF EXISTS "Public view active side events" ON public.side_events;

DROP POLICY IF EXISTS "Anon can view auctions for published tournaments" ON public.auctions;
DROP POLICY IF EXISTS "Authenticated can view auctions for published tournaments" ON public.auctions;
REVOKE SELECT ON public.auctions FROM anon;

CREATE OR REPLACE FUNCTION public.get_public_auctions(_tournament_id uuid)
RETURNS TABLE (
  id uuid, tournament_id uuid, item_name text, description text,
  images text[],
  starting_bid_cents integer, current_bid_cents integer, minimum_increment_cents integer,
  buy_now_cents integer, status text,
  start_time timestamptz, end_time timestamptz, auto_extend_minutes integer,
  winning_bidder_name text, winning_bid_amount_cents integer,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT a.id, a.tournament_id, a.item_name, a.description, a.images,
         a.starting_bid_cents, a.current_bid_cents, a.minimum_increment_cents,
         a.buy_now_cents, a.status, a.start_time, a.end_time,
         a.auto_extend_minutes, a.winning_bidder_name, a.winning_bid_amount_cents,
         a.created_at, a.updated_at
  FROM public.auctions a
  JOIN public.tournaments t ON t.id = a.tournament_id
  WHERE a.tournament_id = _tournament_id AND t.site_published = true
  ORDER BY a.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_public_auctions(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_auctions(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Anon can view raffles for published tournaments" ON public.raffles;
DROP POLICY IF EXISTS "Authenticated can view raffles for published tournaments" ON public.raffles;
REVOKE SELECT ON public.raffles FROM anon;

CREATE OR REPLACE FUNCTION public.get_public_raffles(_tournament_id uuid)
RETURNS TABLE (
  id uuid, tournament_id uuid, item_name text, description text,
  images text[],
  ticket_price_cents integer, max_tickets integer, tickets_sold integer,
  draw_time timestamptz, status text,
  winner_ticket_number integer, winner_name text,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT r.id, r.tournament_id, r.item_name, r.description, r.images,
         r.ticket_price_cents, r.max_tickets, r.tickets_sold, r.draw_time,
         r.status, r.winner_ticket_number, r.winner_name,
         r.created_at, r.updated_at
  FROM public.raffles r
  JOIN public.tournaments t ON t.id = r.tournament_id
  WHERE r.tournament_id = _tournament_id AND t.site_published = true
  ORDER BY r.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_public_raffles(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_raffles(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Anon can view active promoter ref codes" ON public.team_promoters;
REVOKE SELECT ON public.team_promoters FROM anon;

CREATE OR REPLACE FUNCTION public.validate_promoter_ref_code(_tournament_id uuid, _ref_code text)
RETURNS TABLE (id uuid, tournament_id uuid, is_active boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT p.id, p.tournament_id, p.is_active
  FROM public.team_promoters p
  WHERE p.tournament_id = _tournament_id
    AND p.unique_ref_code = _ref_code
    AND p.is_active = true
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.validate_promoter_ref_code(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_promoter_ref_code(uuid, text) TO anon, authenticated;
