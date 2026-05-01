-- Routing log: one row per checkout session created
CREATE TABLE public.payment_routing_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  context TEXT NOT NULL, -- registration | sponsor | store | donation | auction
  tournament_id UUID,
  organization_id UUID,
  organizer_stripe_account_id TEXT,
  organizer_charges_ready BOOLEAN NOT NULL DEFAULT false,
  payment_method_override TEXT NOT NULL DEFAULT 'default', -- default | force_stripe | force_platform
  routing_decision TEXT NOT NULL, -- destination | platform_escrow
  gross_cents INTEGER NOT NULL DEFAULT 0,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  stripe_fee_cents INTEGER NOT NULL DEFAULT 0,
  application_fee_cents INTEGER NOT NULL DEFAULT 0,
  pass_fees_to_participants BOOLEAN,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  buyer_email TEXT,
  notes TEXT
);

CREATE INDEX idx_prl_created ON public.payment_routing_logs (created_at DESC);
CREATE INDEX idx_prl_org ON public.payment_routing_logs (organization_id);
CREATE INDEX idx_prl_tournament ON public.payment_routing_logs (tournament_id);
CREATE INDEX idx_prl_decision ON public.payment_routing_logs (routing_decision);
CREATE INDEX idx_prl_session ON public.payment_routing_logs (stripe_session_id);

ALTER TABLE public.payment_routing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read routing logs"
  ON public.payment_routing_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role bypasses RLS so edge functions can insert; no client insert policy needed.

-- Verification runs (daily verifier output)
CREATE TABLE public.payment_routing_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  total_payments INTEGER NOT NULL DEFAULT 0,
  ok_count INTEGER NOT NULL DEFAULT 0,
  misrouted_count INTEGER NOT NULL DEFAULT 0,
  fee_mismatch_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running', -- running | completed | failed
  error TEXT
);

CREATE INDEX idx_prv_started ON public.payment_routing_verifications (started_at DESC);

ALTER TABLE public.payment_routing_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read verification runs"
  ON public.payment_routing_verifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Per-payment findings
CREATE TABLE public.payment_routing_verification_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_id UUID NOT NULL REFERENCES public.payment_routing_verifications(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_session_id TEXT,
  amount_cents INTEGER,
  expected_destination TEXT,
  actual_destination TEXT,
  expected_application_fee_cents INTEGER,
  actual_application_fee_cents INTEGER,
  context TEXT,
  tournament_id UUID,
  organization_id UUID,
  status TEXT NOT NULL, -- ok | misrouted | fee_mismatch | error
  detail TEXT
);

CREATE INDEX idx_prvf_run ON public.payment_routing_verification_findings (verification_id);
CREATE INDEX idx_prvf_status ON public.payment_routing_verification_findings (status);

ALTER TABLE public.payment_routing_verification_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read verification findings"
  ON public.payment_routing_verification_findings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));