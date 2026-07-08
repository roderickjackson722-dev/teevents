
-- Fix 1: Restrict auction bidder PII to org owners/admins only
CREATE OR REPLACE FUNCTION public.is_org_admin_or_owner(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role IN ('owner','admin')
  )
$$;

DROP POLICY IF EXISTS "Org members view all bids" ON public.auction_bids;
CREATE POLICY "Org admins view bids" ON public.auction_bids FOR SELECT
USING (EXISTS (
  SELECT 1 FROM auctions a JOIN tournaments t ON t.id = a.tournament_id
  WHERE a.id = auction_bids.auction_id AND public.is_org_admin_or_owner(auth.uid(), t.organization_id)
));

DROP POLICY IF EXISTS "Org members manage bids" ON public.auction_bids;
CREATE POLICY "Org admins manage bids" ON public.auction_bids FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM auctions a JOIN tournaments t ON t.id = a.tournament_id
  WHERE a.id = auction_bids.auction_id AND public.is_org_admin_or_owner(auth.uid(), t.organization_id)
));

DROP POLICY IF EXISTS "Org members can view bids" ON public.tournament_auction_bids;
CREATE POLICY "Org admins can view bids" ON public.tournament_auction_bids FOR SELECT
USING (EXISTS (
  SELECT 1 FROM tournament_auction_items ai JOIN tournaments t ON t.id = ai.tournament_id
  WHERE ai.id = tournament_auction_bids.item_id AND public.is_org_admin_or_owner(auth.uid(), t.organization_id)
));

-- Fix 2: Remove overly permissive college player insert policy (stricter sibling remains)
DROP POLICY IF EXISTS "Public can insert players with registration" ON public.college_tournament_players;

-- Fix 3: Prevent public exposure of demo player emails via column-level revoke
REVOKE SELECT (email) ON public.demo_players FROM anon, authenticated;

-- Fix 4: Bind event resource access to authenticated user identity, not just email string
ALTER TABLE public.event_access_requests ADD COLUMN IF NOT EXISTS user_id uuid;

-- Backfill user_id from verified auth.users email matches
UPDATE public.event_access_requests r
SET user_id = u.id
FROM auth.users u
WHERE r.user_id IS NULL
  AND u.email_confirmed_at IS NOT NULL
  AND lower(u.email) = lower(r.email);

-- Default user_id to auth.uid() on new inserts
ALTER TABLE public.event_access_requests ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Replace the weak email-match SELECT policy on event_resources with a user_id-bound check
DROP POLICY IF EXISTS "Approved members can read resources" ON public.event_resources;
CREATE POLICY "Approved members can read resources" ON public.event_resources FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.event_access_requests r
  WHERE r.event_id = event_resources.event_id
    AND r.status = 'approved'
    AND r.user_id = auth.uid()
));
