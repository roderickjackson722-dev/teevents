ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS enterprise_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS enterprise_subscription_status text,
  ADD COLUMN IF NOT EXISTS enterprise_subscription_renews_at timestamptz,
  ADD COLUMN IF NOT EXISTS enterprise_canceled_at timestamptz;

CREATE TABLE public.enterprise_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE SET NULL,
  invoice_number text NOT NULL UNIQUE,
  billing_name text NOT NULL,
  billing_email text NOT NULL,
  billing_address text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','void')),
  due_date date NOT NULL,
  paid_at timestamptz,
  stripe_payment_intent_id text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.enterprise_invoices TO authenticated;
GRANT ALL ON public.enterprise_invoices TO service_role;
ALTER TABLE public.enterprise_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enterprise members view invoices" ON public.enterprise_invoices FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Enterprise members create invoices" ON public.enterprise_invoices FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.is_org_member(auth.uid(), organization_id)) AND created_by = auth.uid());
CREATE POLICY "Enterprise managers update invoices" ON public.enterprise_invoices FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.is_org_admin_or_owner(auth.uid(), organization_id))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.is_org_admin_or_owner(auth.uid(), organization_id));
CREATE INDEX idx_enterprise_invoices_org_status ON public.enterprise_invoices(organization_id, status, due_date);

CREATE TABLE public.enterprise_invoice_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.enterprise_invoices(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.enterprise_invoice_audit_log TO authenticated;
GRANT ALL ON public.enterprise_invoice_audit_log TO service_role;
ALTER TABLE public.enterprise_invoice_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enterprise members view invoice audit" ON public.enterprise_invoice_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Enterprise members add invoice audit" ON public.enterprise_invoice_audit_log FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.is_org_member(auth.uid(), organization_id)) AND actor_id = auth.uid());
CREATE INDEX idx_enterprise_invoice_audit_invoice ON public.enterprise_invoice_audit_log(invoice_id, created_at DESC);

CREATE TABLE public.enterprise_communication_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  sent_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.enterprise_communication_log TO authenticated;
GRANT ALL ON public.enterprise_communication_log TO service_role;
ALTER TABLE public.enterprise_communication_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enterprise members view communications" ON public.enterprise_communication_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Enterprise members add communications" ON public.enterprise_communication_log FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.is_org_member(auth.uid(), organization_id)) AND sent_by = auth.uid());
CREATE INDEX idx_enterprise_communications_org ON public.enterprise_communication_log(organization_id, created_at DESC);