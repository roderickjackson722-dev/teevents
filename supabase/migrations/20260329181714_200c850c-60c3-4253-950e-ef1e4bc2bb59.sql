
-- Platform transactions table (escrow ledger)
CREATE TABLE public.platform_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  net_amount_cents integer NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'registration',
  status text NOT NULL DEFAULT 'held',
  stripe_session_id text,
  stripe_payment_intent_id text,
  payout_id uuid,
  description text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Organization payouts table
CREATE TABLE public.organization_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  platform_fees_cents integer NOT NULL DEFAULT 0,
  stripe_transfer_id text,
  status text NOT NULL DEFAULT 'pending',
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  transaction_count integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Organization payout methods
CREATE TABLE public.organization_payout_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  method_type text NOT NULL DEFAULT 'bank_account',
  bank_name text,
  account_last_four text,
  routing_last_four text,
  stripe_bank_account_token text,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Add platform_fee_rate to organizations (configurable per org, default 0 = no fee)
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS platform_fee_rate numeric DEFAULT 0;

-- Enable RLS
ALTER TABLE public.platform_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_payout_methods ENABLE ROW LEVEL SECURITY;

-- RLS: platform_transactions
CREATE POLICY "Admins can manage all transactions" ON public.platform_transactions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org members can view own transactions" ON public.platform_transactions FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));

-- RLS: organization_payouts
CREATE POLICY "Admins can manage all payouts" ON public.organization_payouts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org members can view own payouts" ON public.organization_payouts FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));

-- RLS: organization_payout_methods
CREATE POLICY "Admins can manage all payout methods" ON public.organization_payout_methods FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Org members can manage own payout methods" ON public.organization_payout_methods FOR ALL TO authenticated USING (is_org_member(auth.uid(), organization_id)) WITH CHECK (is_org_member(auth.uid(), organization_id));
