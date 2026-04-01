
-- Add new columns to organization_payout_methods
ALTER TABLE public.organization_payout_methods
  ADD COLUMN IF NOT EXISTS stripe_account_last4 text,
  ADD COLUMN IF NOT EXISTS stripe_account_brand text,
  ADD COLUMN IF NOT EXISTS pending_change_email text,
  ADD COLUMN IF NOT EXISTS change_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS change_request_status text DEFAULT 'none';

-- Create payout_change_requests table
CREATE TABLE IF NOT EXISTS public.payout_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) NOT NULL,
  requested_by uuid NOT NULL,
  change_type text NOT NULL,
  old_value text,
  new_value text,
  status text DEFAULT 'pending',
  reviewed_by uuid,
  review_notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE public.payout_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage change requests" ON public.payout_change_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org members can view own change requests" ON public.payout_change_requests
  FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert change requests" ON public.payout_change_requests
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));

-- Create payout_audit_log table
CREATE TABLE IF NOT EXISTS public.payout_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payout_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage audit logs" ON public.payout_audit_log
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org members can view own audit logs" ON public.payout_audit_log
  FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert audit logs" ON public.payout_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));
