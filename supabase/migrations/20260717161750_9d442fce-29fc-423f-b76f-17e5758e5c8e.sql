
CREATE TABLE public.league_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('flat_fee','per_golfer')),
  flat_fee_price_cents INTEGER NOT NULL DEFAULT 19900,
  per_golfer_price_cents INTEGER NOT NULL DEFAULT 1000,
  max_golfers INTEGER NOT NULL DEFAULT 0,
  current_golfers INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'incomplete' CHECK (status IN ('incomplete','active','past_due','cancelled','expired','trialing')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_league_subscriptions_org ON public.league_subscriptions(organization_id);
CREATE INDEX idx_league_subscriptions_stripe_sub ON public.league_subscriptions(stripe_subscription_id);
CREATE INDEX idx_league_subscriptions_status ON public.league_subscriptions(status);

GRANT SELECT, INSERT, UPDATE ON public.league_subscriptions TO authenticated;
GRANT ALL ON public.league_subscriptions TO service_role;

ALTER TABLE public.league_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their league subscriptions"
  ON public.league_subscriptions FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org owners/admins can insert league subscriptions"
  ON public.league_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_admin_or_owner(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org owners/admins can update their league subscriptions"
  ON public.league_subscriptions FOR UPDATE
  TO authenticated
  USING (public.is_org_admin_or_owner(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_org_admin_or_owner(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_league_subscriptions_updated_at
  BEFORE UPDATE ON public.league_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.org_has_active_league_subscription(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.league_subscriptions
    WHERE organization_id = _org_id
      AND status IN ('active','trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  );
$$;
