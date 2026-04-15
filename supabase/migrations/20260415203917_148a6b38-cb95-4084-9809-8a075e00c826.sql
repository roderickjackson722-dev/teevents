
-- Add payout method to organizations (default stripe)
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'stripe';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS mailing_address TEXT;

-- Add payout method to tournaments (per-tournament override)
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'stripe';

-- Create manual_payouts table for PayPal and check payouts
CREATE TABLE IF NOT EXISTS public.manual_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  amount_cents INTEGER NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('paypal', 'check')),
  paypal_email TEXT,
  mailing_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manual_payouts ENABLE ROW LEVEL SECURITY;

-- Org members can view their own payouts
CREATE POLICY "Org members can view their manual payouts"
  ON public.manual_payouts
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Org owners can create payout requests
CREATE POLICY "Org owners can create manual payouts"
  ON public.manual_payouts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_owner(auth.uid(), organization_id));
