-- 1) Hide auction winner PII from public/anon reads via column-level privileges
REVOKE SELECT ON public.tournament_auction_items FROM anon;
REVOKE SELECT ON public.tournament_auction_items FROM authenticated;

GRANT SELECT (
  id, tournament_id, title, description, image_url, type,
  starting_bid, current_bid, buy_now_price, raffle_ticket_price,
  is_active, sort_order, created_at
) ON public.tournament_auction_items TO anon;

GRANT SELECT (
  id, tournament_id, title, description, image_url, type,
  starting_bid, current_bid, buy_now_price, raffle_ticket_price,
  is_active, sort_order, created_at
) ON public.tournament_auction_items TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.tournament_auction_items TO authenticated;
GRANT ALL ON public.tournament_auction_items TO service_role;

-- Organizer/admin-only access to winner details
CREATE OR REPLACE FUNCTION public.get_auction_items_for_manager(_tournament_id uuid)
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
  winner_name text,
  winner_email text,
  is_active boolean,
  sort_order integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.tournament_id, i.title, i.description, i.image_url, i.type,
         i.starting_bid, i.current_bid, i.buy_now_price, i.raffle_ticket_price,
         i.winner_name, i.winner_email, i.is_active, i.sort_order, i.created_at
  FROM public.tournament_auction_items i
  JOIN public.tournaments t ON t.id = i.tournament_id
  WHERE i.tournament_id = _tournament_id
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.is_org_member(auth.uid(), t.organization_id)
    )
  ORDER BY i.sort_order;
$$;

REVOKE ALL ON FUNCTION public.get_auction_items_for_manager(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auction_items_for_manager(uuid) TO authenticated;

-- 2) Validate public refund request submissions
DROP POLICY IF EXISTS "Anyone can submit refund requests" ON public.tournament_refund_requests;

CREATE POLICY "Public can submit validated refund requests"
ON public.tournament_refund_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND amount_cents >= 0
  AND length(btrim(reason)) BETWEEN 1 AND 2000
  AND EXISTS (
    SELECT 1
    FROM public.tournament_registrations r
    JOIN public.tournaments t ON t.id = r.tournament_id
    WHERE r.id = tournament_refund_requests.registration_id
      AND r.tournament_id = tournament_refund_requests.tournament_id
      AND r.payment_status = 'paid'
      AND tournament_refund_requests.amount_cents <= COALESCE(t.registration_fee_cents, 0)
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.tournament_refund_requests x
    WHERE x.registration_id = tournament_refund_requests.registration_id
      AND x.status = 'pending'
  )
);