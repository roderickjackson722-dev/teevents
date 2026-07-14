
DROP POLICY IF EXISTS "Owners can delete members" ON public.org_members;
DROP POLICY IF EXISTS "Owners can update members" ON public.org_members;

CREATE POLICY "Owners or platform admins can delete members"
ON public.org_members FOR DELETE
USING (
  (public.is_org_owner(auth.uid(), organization_id) AND role <> 'owner')
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Owners or platform admins can update members"
ON public.org_members FOR UPDATE
USING (
  public.is_org_owner(auth.uid(), organization_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
