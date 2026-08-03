CREATE POLICY "Org members can update sponsor registrations"
ON public.sponsor_registrations
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tournaments t
  JOIN public.org_members om ON om.organization_id = t.organization_id
  WHERE t.id = sponsor_registrations.tournament_id AND om.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tournaments t
  JOIN public.org_members om ON om.organization_id = t.organization_id
  WHERE t.id = sponsor_registrations.tournament_id AND om.user_id = auth.uid()
));