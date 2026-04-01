
-- Add missing columns to organization_payout_methods
ALTER TABLE public.organization_payout_methods
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paypal_email TEXT,
  ADD COLUMN IF NOT EXISTS preferred_method TEXT DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Create stripe_onboarding_logs table
CREATE TABLE IF NOT EXISTS public.stripe_onboarding_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  stripe_account_id TEXT,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.stripe_onboarding_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage onboarding logs" ON public.stripe_onboarding_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members can view own onboarding logs" ON public.stripe_onboarding_logs
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Create paypal_payouts table
CREATE TABLE IF NOT EXISTS public.paypal_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  amount_cents INTEGER NOT NULL,
  paypal_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  batch_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.paypal_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage paypal payouts" ON public.paypal_payouts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members can view own paypal payouts" ON public.paypal_payouts
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
