-- 1. Auction items: stop exposing winner_name / winner_email publicly.
DROP POLICY IF EXISTS "Public can view active auction items" ON public.tournament_auction_items;

CREATE OR REPLACE VIEW public.public_auction_items
WITH (security_invoker = off) AS
SELECT ai.id, ai.tournament_id, ai.title, ai.description, ai.image_url, ai.type,
       ai.starting_bid, ai.current_bid, ai.buy_now_price, ai.raffle_ticket_price,
       ai.is_active, ai.sort_order, ai.created_at
FROM public.tournament_auction_items ai
JOIN public.tournaments t ON t.id = ai.tournament_id
WHERE t.site_published = true AND ai.is_active = true;

GRANT SELECT ON public.public_auction_items TO anon, authenticated;

-- 2. Offline donations: stop exposing donor_name / amounts row-by-row publicly.
DROP POLICY IF EXISTS "Public can view offline donations for published tournaments" ON public.tournament_offline_donations;

CREATE OR REPLACE FUNCTION public.get_public_offline_donation_total(_tournament_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(od.amount_cents), 0)::bigint
  FROM public.tournament_offline_donations od
  JOIN public.tournaments t ON t.id = od.tournament_id
  WHERE od.tournament_id = _tournament_id
    AND t.site_published = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_offline_donation_total(uuid) TO anon, authenticated;