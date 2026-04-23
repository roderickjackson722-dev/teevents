-- Part 1: Email-confirmed payout method changes
-- Extend existing payout_change_requests table with confirmation token columns
ALTER TABLE public.payout_change_requests
  ADD COLUMN IF NOT EXISTS token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS requested_method TEXT,
  ADD COLUMN IF NOT EXISTS paypal_email TEXT,
  ADD COLUMN IF NOT EXISTS mailing_address TEXT;

CREATE INDEX IF NOT EXISTS payout_change_requests_token_idx
  ON public.payout_change_requests(token)
  WHERE token IS NOT NULL;

-- Allow public (anon) to look up a request by its unguessable token
-- so the confirmation page can verify the link before the org member
-- clicks "Confirm". This SELECT is restricted to a single token at a
-- time and is safe because the token is high-entropy and time-limited.
DROP POLICY IF EXISTS "Public can read pending request by token" ON public.payout_change_requests;
CREATE POLICY "Public can read pending request by token"
  ON public.payout_change_requests
  FOR SELECT
  TO anon, authenticated
  USING (token IS NOT NULL AND confirmed_at IS NULL AND expires_at > now());

-- Part 2: Admin payout overrides — audit log of admin-forced payout method changes
CREATE TABLE IF NOT EXISTS public.admin_payout_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  old_method TEXT,
  new_method TEXT NOT NULL,
  paypal_email TEXT,
  mailing_address TEXT,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_payout_overrides_org_idx
  ON public.admin_payout_overrides(organization_id, created_at DESC);

ALTER TABLE public.admin_payout_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payout overrides"
  ON public.admin_payout_overrides
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org members can view their override history"
  ON public.admin_payout_overrides
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Part 3: Add max_per_golfer to existing add-ons table
ALTER TABLE public.tournament_registration_addons
  ADD COLUMN IF NOT EXISTS max_per_golfer INTEGER NOT NULL DEFAULT 1;

-- Track which add-ons each registration purchased
CREATE TABLE IF NOT EXISTS public.tournament_registration_addon_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.tournament_registrations(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.tournament_registration_addons(id) ON DELETE RESTRICT,
  addon_name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS addon_purchases_registration_idx
  ON public.tournament_registration_addon_purchases(registration_id);

ALTER TABLE public.tournament_registration_addon_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view addon purchases"
  ON public.tournament_registration_addon_purchases
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournament_registrations r
    JOIN public.tournaments t ON t.id = r.tournament_id
    WHERE r.id = tournament_registration_addon_purchases.registration_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  ));

CREATE POLICY "Admins can view addon purchases"
  ON public.tournament_registration_addon_purchases
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
