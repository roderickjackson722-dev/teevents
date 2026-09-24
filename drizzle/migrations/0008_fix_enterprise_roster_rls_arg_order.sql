DROP POLICY "Org members read roster" ON public.enterprise_roster;
DROP POLICY "Org members insert roster" ON public.enterprise_roster;
DROP POLICY "Org members update roster" ON public.enterprise_roster;
DROP POLICY "Org members delete roster" ON public.enterprise_roster;

CREATE POLICY "Org members read roster" ON public.enterprise_roster
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members insert roster" ON public.enterprise_roster
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members update roster" ON public.enterprise_roster
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members delete roster" ON public.enterprise_roster
  FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(), 'admin'));