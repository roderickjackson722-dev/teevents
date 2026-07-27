-- 1. sample_tournaments: strip prospect CRM PII from the authenticated role
REVOKE SELECT ON public.sample_tournaments FROM authenticated;
GRANT SELECT (id, admin_id, unique_slug, tournament_name, event_date, location, description,
  logo_url, hero_image_url, scoring_format, registration_fee_cents, team_fee_cents,
  view_count, last_accessed_at, created_at, updated_at) ON public.sample_tournaments TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_sample_tournaments()
RETURNS SETOF public.sample_tournaments
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.sample_tournaments
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_sample_tournament(_id uuid)
RETURNS SETOF public.sample_tournaments
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.sample_tournaments
  WHERE id = _id AND public.has_role(auth.uid(), 'admin'::app_role);
$$;

REVOKE ALL ON FUNCTION public.admin_list_sample_tournaments() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_sample_tournament(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_sample_tournaments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_sample_tournament(uuid) TO authenticated;

-- 2. organization_payout_methods: owners/admins only + stop realtime broadcast
DROP POLICY IF EXISTS "Org members can manage own payout methods" ON public.organization_payout_methods;
CREATE POLICY "Org admins manage payout methods"
ON public.organization_payout_methods
FOR ALL
TO authenticated
USING (public.is_org_admin_or_owner(auth.uid(), organization_id))
WITH CHECK (public.is_org_admin_or_owner(auth.uid(), organization_id));

REVOKE ALL ON public.organization_payout_methods FROM anon;
ALTER PUBLICATION supabase_realtime DROP TABLE public.organization_payout_methods;

-- 3. tournament_auction_bids: validate public inserts
DROP POLICY IF EXISTS "Anyone can place bids" ON public.tournament_auction_bids;
CREATE POLICY "Public can place validated bids"
ON public.tournament_auction_bids
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.tournament_auction_items ai WHERE ai.id = item_id)
  AND char_length(bidder_name) BETWEEN 1 AND 200
  AND bidder_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND char_length(bidder_email) <= 254
  AND (bidder_phone IS NULL OR char_length(bidder_phone) <= 50)
  AND amount > 0 AND amount <= 1000000
);
REVOKE SELECT, UPDATE, DELETE ON public.tournament_auction_bids FROM anon;

-- 4. director_shop_orders: validate public inserts, no client-set paid status
DROP POLICY IF EXISTS "Anyone can create orders" ON public.director_shop_orders;
CREATE POLICY "Public can create validated orders"
ON public.director_shop_orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(contact_name) BETWEEN 1 AND 200
  AND contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND char_length(contact_email) <= 254
  AND (contact_phone IS NULL OR char_length(contact_phone) <= 50)
  AND (order_notes IS NULL OR char_length(order_notes) <= 2000)
  AND (amount_cents IS NULL OR (amount_cents >= 0 AND amount_cents <= 100000000))
  AND (payment_status IS NULL OR payment_status = 'pending')
);
REVOKE SELECT, UPDATE, DELETE ON public.director_shop_orders FROM anon;