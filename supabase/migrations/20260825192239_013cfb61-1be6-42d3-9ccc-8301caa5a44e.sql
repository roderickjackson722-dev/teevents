DROP VIEW IF EXISTS public.public_auction_items;

CREATE OR REPLACE FUNCTION public.get_public_auction_items(_tournament_id uuid)
RETURNS TABLE (
  id uuid,
  tournament_id uuid,
  title text,
  description text,
  image_url text,
  type text,
  starting_bid numeric,
  current_bid numeric,
  buy_now_price numeric,
  raffle_ticket_price numeric,
  is_active boolean,
  sort_order integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ai.id, ai.tournament_id, ai.title, ai.description, ai.image_url, ai.type,
         ai.starting_bid, ai.current_bid, ai.buy_now_price, ai.raffle_ticket_price,
         ai.is_active, ai.sort_order, ai.created_at
  FROM public.tournament_auction_items ai
  JOIN public.tournaments t ON t.id = ai.tournament_id
  WHERE ai.tournament_id = _tournament_id
    AND t.site_published = true
    AND ai.is_active = true
  ORDER BY ai.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_auction_items(uuid) TO anon, authenticated;