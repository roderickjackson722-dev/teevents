CREATE TABLE public.enterprise_account_approvals (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  approved_email text NOT NULL,
  approved_by uuid NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.enterprise_account_approvals TO authenticated;
GRANT ALL ON public.enterprise_account_approvals TO service_role;
ALTER TABLE public.enterprise_account_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins read Enterprise approvals" ON public.enterprise_account_approvals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read their Enterprise approval" ON public.enterprise_account_approvals FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Platform admins insert Enterprise approvals" ON public.enterprise_account_approvals FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND approved_by = auth.uid() AND EXISTS (SELECT 1 FROM public.org_members m WHERE m.organization_id = enterprise_account_approvals.organization_id AND m.user_id = enterprise_account_approvals.owner_user_id AND m.role = 'owner'));
CREATE POLICY "Platform admins update Enterprise approvals" ON public.enterprise_account_approvals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin') AND approved_by = auth.uid() AND EXISTS (SELECT 1 FROM public.org_members m WHERE m.organization_id = enterprise_account_approvals.organization_id AND m.user_id = enterprise_account_approvals.owner_user_id AND m.role = 'owner'));
COMMENT ON TABLE public.enterprise_account_approvals IS 'Platform-admin approved Enterprise workspace access, independent of subscription billing and existing tournament pricing.';