
-- Allow org owners to delete non-owner members
CREATE POLICY "Owners can delete members" ON public.org_members
  FOR DELETE TO authenticated
  USING (is_org_owner(auth.uid(), organization_id) AND role != 'owner');

-- Allow org owners to update member permissions
CREATE POLICY "Owners can update members" ON public.org_members
  FOR UPDATE TO authenticated
  USING (is_org_owner(auth.uid(), organization_id))
  WITH CHECK (is_org_owner(auth.uid(), organization_id));
