
DROP POLICY IF EXISTS "Org owners and admins can manage notification emails" ON public.notification_emails;
CREATE POLICY "Org members and admins can manage notification emails"
ON public.notification_emails
FOR ALL
TO authenticated
USING (
  public.is_org_member(auth.uid(), organization_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.is_org_member(auth.uid(), organization_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
