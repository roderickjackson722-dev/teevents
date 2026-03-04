CREATE POLICY "Org members can insert registrations"
ON public.tournament_registrations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_registrations.tournament_id
    AND is_org_member(auth.uid(), t.organization_id)
  )
);